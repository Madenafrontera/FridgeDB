import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";
import { prisma } from "./prisma.js";
import { suggestRecipesFromIngredients } from "./services/aiService.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

type JsonParseError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

type ValidationFields = Record<string, string>;

const isValidDateString = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const dateStringSchema = z
  .string()
  .refine(isValidDateString, "expirationDate must be a valid date string using YYYY-MM-DD");

const fridgeItemCreateSchema = z
  .object({
    userId: z.string().trim().min(1, "userId is required"),
    categoryId: z.string().trim().min(1, "categoryId is required"),
    iconId: z.string().trim().min(1, "iconId is required"),
    name: z.string().trim().min(1, "name is required"),
    quantity: z.number().int("quantity must be a whole number").positive("quantity must be greater than 0"),
    expirationDate: dateStringSchema.optional(),
  })
  .strict();

const fridgeItemUpdateSchema = fridgeItemCreateSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const recipeSuggestionSchema = z
  .object({
    ingredients: z
      .array(z.string().trim().min(1, "ingredient name is required").max(80, "ingredient name is too long"))
      .min(1, "At least one ingredient is required")
      .max(20, "Use 20 ingredients or fewer"),
  })
  .strict();

type FridgeItemInput = z.infer<typeof fridgeItemCreateSchema>;

const formatZodFields = (error: ZodError): ValidationFields => {
  const fields: ValidationFields = {};

  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        fields[key] = "Field is not allowed";
      }
      continue;
    }

    const field = issue.path.length > 0 ? issue.path.join(".") : "body";
    if (issue.code === "invalid_type" && issue.input === undefined && field !== "body") {
      fields[field] = field + " is required";
      continue;
    }

    fields[field] = issue.message;
  }

  return fields;
};

const sendError = (res: express.Response, status: number, code: string, message: string) => {
  res.status(status).json({
    error: {
      code,
      message,
    },
  });
};

const sendValidationError = (
  res: express.Response,
  fields: ValidationFields,
  message = "Invalid request body",
) => {
  res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
      fields,
    },
  });
};

const sendNotFound = (res: express.Response, message = "Fridge item not found") => {
  sendError(res, 404, "NOT_FOUND", message);
};

const parseRouteId = (value: string): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getValidIdParam = (idParam: string, res: express.Response): number | null => {
  const id = parseRouteId(idParam);

  if (!id) {
    sendValidationError(res, { id: "id must be a positive number, for example 1" });
    return null;
  }

  return id;
};

const parseExpirationDateForPrisma = (expirationDate: string | undefined) =>
  expirationDate ? new Date(expirationDate + "T00:00:00.000Z") : undefined;

const toPrismaProductCreateData = (input: FridgeItemInput) => ({
  userId: input.userId,
  categoryId: input.categoryId,
  iconId: input.iconId,
  name: input.name,
  quantity: input.quantity,
  expirationDate: parseExpirationDateForPrisma(input.expirationDate),
});

const toPrismaProductUpdateData = (input: Partial<FridgeItemInput>) => ({
  ...input,
  expirationDate: parseExpirationDateForPrisma(input.expirationDate),
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "fridgedb-api",
  });
});

app.get("/version", (_req, res) => {
  res.json({
    name: "fridgedb-api",
    version: "0.1.0",
  });
});

app.get("/fridge-items", async (_req, res, next) => {
  try {
    const items = await prisma.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

app.post("/fridge-items", async (req, res, next) => {
  try {
    const result = fridgeItemCreateSchema.safeParse(req.body);

    if (!result.success) {
      sendValidationError(res, formatZodFields(result.error));
      return;
    }

    const item = await prisma.product.create({
      data: toPrismaProductCreateData(result.data),
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.get("/fridge-items/:id", async (req, res, next) => {
  try {
    const id = getValidIdParam(req.params.id, res);
    if (!id) {
      return;
    }

    const item = await prisma.product.findFirst({
      where: { id, status: { not: "deleted" } },
    });

    if (!item) {
      sendNotFound(res);
      return;
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.put("/fridge-items/:id", async (req, res, next) => {
  try {
    const id = getValidIdParam(req.params.id, res);
    if (!id) {
      return;
    }

    const result = fridgeItemUpdateSchema.safeParse(req.body);

    if (!result.success) {
      sendValidationError(res, formatZodFields(result.error));
      return;
    }

    const existingItem = await prisma.product.findFirst({
      where: { id, status: { not: "deleted" } },
    });

    if (!existingItem) {
      sendNotFound(res);
      return;
    }

    const item = await prisma.product.update({
      where: { id },
      data: toPrismaProductUpdateData(result.data),
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
});

app.delete("/fridge-items/:id", async (req, res, next) => {
  try {
    const id = getValidIdParam(req.params.id, res);
    if (!id) {
      return;
    }

    const existingItem = await prisma.product.findFirst({
      where: { id, status: { not: "deleted" } },
    });

    if (!existingItem) {
      sendNotFound(res);
      return;
    }

    await prisma.product.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/recipes/suggest", async (req, res, next) => {
  try {
    const result = recipeSuggestionSchema.safeParse(req.body);

    if (!result.success) {
      sendValidationError(res, formatZodFields(result.error));
      return;
    }

    const ingredients = result.data.ingredients.map((ingredient) => ingredient.trim());
    const suggestions = await suggestRecipesFromIngredients(ingredients);

    res.json({
      suggestions,
    });
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  sendNotFound(res, "Route not found");
});

const errorHandler: ErrorRequestHandler = (error: JsonParseError, _req, res, _next) => {
  if (error.type === "entity.parse.failed") {
    sendValidationError(res, { body: "Request body must be valid JSON" });
    return;
  }

  if (error.status === 400 || error.statusCode === 400) {
    sendValidationError(res, { body: error.message || "The request is invalid" });
    return;
  }

  console.error(error);

  sendError(res, 500, "INTERNAL_ERROR", "Unexpected server error");
};

app.use(errorHandler);

const server = app.listen(port, () => {
  console.log("FridgeDB API server started");
  console.log(`Listening on port ${port}`);
});

const shutdown = async () => {
  console.log("Shutting down FridgeDB API server");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

-- Local development reset for the initial fridge_items table.
-- The API now uses simple IDs instead of UUIDs for early CRUD testing.
DROP TABLE IF EXISTS "fridge_items";

CREATE TABLE "fridge_items" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "icon_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiration_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "fridge_items_pkey" PRIMARY KEY ("id")
);

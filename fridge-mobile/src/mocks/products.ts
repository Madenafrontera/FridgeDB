import { Product } from '@/types/product';

export const mockProducts: Product[] = [
  {
    id: 'milk',
    name: 'Milk',
    category: 'Daily',
    quantity: 1,
    expiresAt: '2026-06-02',
  },
  {
    id: 'spinach',
    name: 'Spinach',
    category: 'Vegetables',
    quantity: 2,
    expiresAt: '2026-05-30',
  },
  {
    id: 'chicken',
    name: 'Chicken breast',
    category: 'Meat',
    quantity: 1,
    expiresAt: '2026-05-29',
  },
  {
    id: 'orange-juice',
    name: 'Orange juice',
    category: 'Drinks',
    quantity: 1,
    expiresAt: '2026-06-04',
  },
  {
    id: 'frozen-peas',
    name: 'Frozen peas',
    category: 'Frozen',
    quantity: 1,
    expiresAt: '2026-08-15',
  },
  {
    id: 'salsa',
    name: 'Salsa jar',
    category: 'Extras',
    quantity: 1,
    expiresAt: '2026-07-01',
  },
];

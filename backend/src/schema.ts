import { pgTable, serial, varchar, text, numeric, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  created_at: timestamp('created_at').defaultNow()
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name_en: varchar('name_en', { length: 255 }).notNull(),
  name_am: varchar('name_am', { length: 255 }),
  name_om: varchar('name_om', { length: 255 }),
  description_en: text('description_en'),
  description_am: text('description_am'),
  description_om: text('description_om'),
  type: varchar('type', { length: 50 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'),
  ingredients: text('ingredients'),
  macro_kcal: numeric('macro_kcal', { precision: 10, scale: 2 }),
  macro_protein: numeric('macro_protein', { precision: 10, scale: 2 }),
  macro_fat: numeric('macro_fat', { precision: 10, scale: 2 }),
  macro_carbs: numeric('macro_carbs', { precision: 10, scale: 2 }),
  beds: integer('beds').default(1),
  max_guests: integer('max_guests').default(2),
  is_available: boolean('is_available').default(true),
  room_number: varchar('room_number', { length: 50 }),
  subcategory: varchar('subcategory', { length: 255 }),
  created_at: timestamp('created_at').defaultNow()
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  service_id: integer('service_id'),
  category: varchar('category', { length: 255 }),
  comment: text('comment').notNull(),
  rating: integer('rating'),
  created_at: timestamp('created_at').defaultNow()
});

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  service_id: integer('service_id').notNull(),
  created_at: timestamp('created_at').defaultNow()
});

export const roomOrders = pgTable('room_orders', {
  id: serial('id').primaryKey(),
  room_number: varchar('room_number', { length: 50 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  created_at: timestamp('created_at').defaultNow()
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull(),
  service_id: integer('service_id').notNull(),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull()
});

export const waiterCalls = pgTable('waiter_calls', {
  id: serial('id').primaryKey(),
  room_number: varchar('room_number', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  created_at: timestamp('created_at').defaultNow()
});

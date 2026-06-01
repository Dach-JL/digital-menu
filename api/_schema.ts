import { mysqlTable, int, varchar, text, decimal, boolean, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  created_at: timestamp('created_at').defaultNow()
});

export const services = mysqlTable('services', {
  id: int('id').autoincrement().primaryKey(),
  name_en: varchar('name_en', { length: 255 }).notNull(),
  name_am: varchar('name_am', { length: 255 }),
  name_om: varchar('name_om', { length: 255 }),
  description_en: text('description_en'),
  description_am: text('description_am'),
  description_om: text('description_om'),
  type: varchar('type', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'),
  ingredients: text('ingredients'),
  macro_kcal: decimal('macro_kcal', { precision: 10, scale: 2 }),
  macro_protein: decimal('macro_protein', { precision: 10, scale: 2 }),
  macro_fat: decimal('macro_fat', { precision: 10, scale: 2 }),
  macro_carbs: decimal('macro_carbs', { precision: 10, scale: 2 }),
  beds: int('beds').default(1),
  max_guests: int('max_guests').default(2),
  is_available: boolean('is_available').default(true),
  room_number: varchar('room_number', { length: 50 }),
  subcategory: varchar('subcategory', { length: 255 }),
  created_at: timestamp('created_at').defaultNow()
});

export const feedback = mysqlTable('feedback', {
  id: int('id').autoincrement().primaryKey(),
  user_id: int('user_id'),
  service_id: int('service_id'),
  category: varchar('category', { length: 255 }),
  comment: text('comment').notNull(),
  rating: int('rating'),
  created_at: timestamp('created_at').defaultNow()
});

export const favorites = mysqlTable('favorites', {
  id: int('id').autoincrement().primaryKey(),
  user_id: int('user_id').notNull(),
  service_id: int('service_id').notNull(),
  created_at: timestamp('created_at').defaultNow()
});

export const roomOrders = mysqlTable('room_orders', {
  id: int('id').autoincrement().primaryKey(),
  room_number: varchar('room_number', { length: 50 }).notNull(),
  total_price: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  created_at: timestamp('created_at').defaultNow()
});

export const orderItems = mysqlTable('order_items', {
  id: int('id').autoincrement().primaryKey(),
  order_id: int('order_id').notNull(),
  service_id: int('service_id').notNull(),
  quantity: int('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull()
});

export const waiterCalls = mysqlTable('waiter_calls', {
  id: int('id').autoincrement().primaryKey(),
  room_number: varchar('room_number', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  created_at: timestamp('created_at').defaultNow()
});

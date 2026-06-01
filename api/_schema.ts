import { mysqlTable, int, varchar, text, decimal, boolean, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  createdAt: timestamp('created_at').defaultNow()
});

export const services = mysqlTable('services', {
  id: int('id').autoincrement().primaryKey(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  nameAm: varchar('name_am', { length: 255 }),
  nameOm: varchar('name_om', { length: 255 }),
  descriptionEn: text('description_en'),
  descriptionAm: text('description_am'),
  descriptionOm: text('description_om'),
  type: varchar('type', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  ingredients: text('ingredients'),
  macroKcal: decimal('macro_kcal', { precision: 10, scale: 2 }),
  macroProtein: decimal('macro_protein', { precision: 10, scale: 2 }),
  macroFat: decimal('macro_fat', { precision: 10, scale: 2 }),
  macroCarbs: decimal('macro_carbs', { precision: 10, scale: 2 }),
  beds: int('beds').default(1),
  maxGuests: int('max_guests').default(2),
  isAvailable: boolean('is_available').default(true),
  roomNumber: varchar('room_number', { length: 50 }),
  subcategory: varchar('subcategory', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow()
});

export const feedback = mysqlTable('feedback', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id'),
  serviceId: int('service_id'),
  category: varchar('category', { length: 255 }),
  comment: text('comment').notNull(),
  rating: int('rating'),
  createdAt: timestamp('created_at').defaultNow()
});

export const favorites = mysqlTable('favorites', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  serviceId: int('service_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const roomOrders = mysqlTable('room_orders', {
  id: int('id').autoincrement().primaryKey(),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow()
});

export const orderItems = mysqlTable('order_items', {
  id: int('id').autoincrement().primaryKey(),
  orderId: int('order_id').notNull(),
  serviceId: int('service_id').notNull(),
  quantity: int('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull()
});

export const waiterCalls = mysqlTable('waiter_calls', {
  id: int('id').autoincrement().primaryKey(),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow()
});

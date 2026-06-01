import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const pool = getPool();

  const sql = async (queryStr: string, values: any[] = []) => {
    const [rows] = await pool.query(queryStr, values);
    return rows as any;
  };

  try {
    // 1. Create Users table
    await sql(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create Services table
    await sql(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_am VARCHAR(255),
        name_om VARCHAR(255),
        description_en TEXT,
        description_am TEXT,
        description_om TEXT,
        type VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        ingredients TEXT,
        macro_kcal DECIMAL(10,2),
        macro_protein DECIMAL(10,2),
        macro_fat DECIMAL(10,2),
        macro_carbs DECIMAL(10,2),
        beds INT DEFAULT 1,
        max_guests INT DEFAULT 2,
        is_available BOOLEAN DEFAULT TRUE,
        room_number VARCHAR(50),
        subcategory VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create Feedback table
    await sql(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        service_id INT,
        category VARCHAR(255),
        comment TEXT NOT NULL,
        rating INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `);

    // 4. Create Favorites table
    await sql(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, service_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
      )
    `);

    // 5. Create Room orders table
    await sql(`
      CREATE TABLE IF NOT EXISTS room_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_number VARCHAR(50) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Create Order items table
    await sql(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        service_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY(order_id) REFERENCES room_orders(id) ON DELETE CASCADE,
        FOREIGN KEY(service_id) REFERENCES services(id)
      )
    `);

    // 7. Create Waiter calls table
    await sql(`
      CREATE TABLE IF NOT EXISTS waiter_calls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_number VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if columns need to be added dynamically (for existing services tables)
    const cols1 = await sql(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'is_available'
    `);
    if (cols1.length === 0) {
      await sql(`ALTER TABLE services ADD COLUMN is_available BOOLEAN DEFAULT TRUE`);
    }

    const cols2 = await sql(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'room_number'
    `);
    if (cols2.length === 0) {
      await sql(`ALTER TABLE services ADD COLUMN room_number VARCHAR(50)`);
    }

    const cols3 = await sql(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'subcategory'
    `);
    if (cols3.length === 0) {
      await sql('ALTER TABLE services ADD COLUMN subcategory VARCHAR(255)');
    }

    // Seed default admin user if not present
    const admins = await sql(`SELECT id FROM users WHERE email = ?`, ['admin@admin.com']);
    if (admins.length === 0) {
      await sql(`
        INSERT INTO users (email, username, password, role)
        VALUES ('admin@admin.com', 'Administrator', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
      `);
    }

    return res.json({ success: true, message: 'Migration completed successfully' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

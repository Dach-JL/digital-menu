import { Router, Request, Response } from 'express';
import { sql } from '../db.js';
import bcrypt from 'bcryptjs';

const router = Router();

export async function runMigrations() {
  console.log('🔄 Running database migrations on Neon PostgreSQL...');

  // 1. Users table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Services table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL,
      name_am VARCHAR(255),
      name_om VARCHAR(255),
      description_en TEXT,
      description_am TEXT,
      description_om TEXT,
      type VARCHAR(50) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      image_url TEXT,
      ingredients TEXT,
      macro_kcal NUMERIC(10,2),
      macro_protein NUMERIC(10,2),
      macro_fat NUMERIC(10,2),
      macro_carbs NUMERIC(10,2),
      beds INT DEFAULT 1,
      max_guests INT DEFAULT 2,
      is_available BOOLEAN DEFAULT TRUE,
      room_number VARCHAR(50),
      subcategory VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Feedback table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      service_id INT REFERENCES services(id) ON DELETE CASCADE,
      category VARCHAR(255),
      comment TEXT NOT NULL,
      rating INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Favorites table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, service_id)
    );
  `);

  // 5. Room orders table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS room_orders (
      id SERIAL PRIMARY KEY,
      room_number VARCHAR(50) NOT NULL,
      total_price NUMERIC(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Order items table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES room_orders(id) ON DELETE CASCADE,
      service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      quantity INT NOT NULL,
      price NUMERIC(10,2) NOT NULL
    );
  `);

  // 7. Waiter calls table
  await sql.query(`
    CREATE TABLE IF NOT EXISTS waiter_calls (
      id SERIAL PRIMARY KEY,
      room_number VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user if not present
  const adminCheck = await sql.query(`SELECT id FROM users WHERE email = $1`, ['admin@admin.com']);
  if (adminCheck.length === 0) {
    const defaultPassword = await bcrypt.hash('password', 10);
    await sql.query(
      `INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4)`,
      ['admin@admin.com', 'Administrator', defaultPassword, 'admin']
    );
    console.log('✅ Default admin user created: admin@admin.com / password');
  }

  // Seed sample services if catalog is empty
  const serviceCount = await sql.query(`SELECT COUNT(*)::int as count FROM services`);
  if (serviceCount.length > 0 && serviceCount[0].count === 0) {
    console.log('🌱 Seeding initial menu services...');
    await sql.query(`
      INSERT INTO services (name_en, name_am, name_om, description_en, description_am, description_om, type, subcategory, price, image_url, ingredients, macro_kcal, macro_protein, macro_fat, macro_carbs, is_available)
      VALUES
        ('Tandoori Chicken', 'ታንዱሪ ዶሮ', 'Lukkuu Taandoorii', 'Authentic roasted chicken marinated in yogurt and aromatic spices.', 'በእርጎ እና ቅመማ ቅመም የተቀመመ ጣፋጭ የዶሮ ምግብ።', 'Lukkuu mi''aawaa aadaa qophaa''e.', 'meal', 'Chicken Dishes', 350.00, 'uploads/69d532fa46ec1-Tandoori Chicken Recipe (Authentic, Easy & Best) - Cubes N Juliennes.jpg', 'Chicken, Yogurt, Ginger, Garlic, Garam Masala', 450, 42, 18, 12, true),
        ('Creamy Garlic Potatoes', 'ክሬሚ ነጭ ሽንኩርት ድንች', 'Dinnicha Qullubbii Adii', 'Tender baby potatoes tossed in rich garlic cream sauce and herbs.', 'በነጭ ሽንኩርት ክሬም የተዘጋጀ ጣፋጭ ድንች።', 'Dinnicha laafaa qullubbii adii fi kirimii waliin qophaa''e.', 'meal', 'Appetizers / Starters', 220.00, 'uploads/69d530f1743f9-Creamy Garlic Sauce Potatoes.jpg', 'Potatoes, Heavy Cream, Garlic, Butter, Parsley', 320, 6, 16, 38, true),
        ('Chilled Fanta', 'ቀዝቃዛ ፋንታ', 'Faantaa Qabbanaawaa', 'Refreshing orange flavored fizzy soda served with ice.', 'በረዶ የተቀላቀለበት የሚያድስ የብርቱካን ለስላሳ መጠጥ።', 'Dhugaatii burtukaanaa qabbanaawaa.', 'drink', 'Cold Drinks', 80.00, 'uploads/69d5a5d9e3655-Fanta - Drink Works.jpg', 'Carbonated water, Orange flavor, Sugar', 140, 0, 0, 35, true),
        ('Royal Deluxe Suite', 'ሮያል ዴሉክስ ክፍል', 'Kutaa Rooyaal Dilaaksii', 'Spacious executive room with king size bed, private balcony, and ambient city view.', 'ምቹ አልጋ እና ውብ እይታ ያለው የክብር እንግዶች ክፍል ደረጃ።', 'Kutaa qananii siree guddaa fi mul''ata magaalaa qabu.', 'room', 'Suites', 2500.00, 'uploads/69d5725b26e39-Queen Size Hydraulic Storage Platform Bed with Rectangular Pattern Headboard & Storage Underneath, Noise Free Bed Frame.jpg', 'King Bed, Free Wi-Fi, Air Conditioning, Smart TV, Mini Bar', null, null, null, null, true);
    `);
    console.log('✅ Initial menu services seeded.');
  }

  console.log('✅ Neon PostgreSQL migrations complete.');
}

router.get('/', async (req: Request, res: Response) => {
  try {
    await runMigrations();
    res.json({ success: true, message: 'Migrations completed successfully' });
  } catch (error: any) {
    console.error('Migration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// If executed directly from CLI: node/tsx migrate.ts
if (process.argv[1]?.includes('migrate')) {
  runMigrations().then(() => {
    console.log('Migration process finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

export default router;

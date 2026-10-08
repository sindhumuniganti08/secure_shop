const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'secureshop.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Create Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Create Products Table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 100,
      image_url TEXT
    )
  `);

  // 3. Create Orders Table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      shipping_address TEXT,
      payment_status TEXT DEFAULT 'Completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // 4. Create Order Items Table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // 5. Create Audit Logs Table
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_type TEXT NOT NULL,
      username TEXT,
      ip_address TEXT,
      details TEXT,
      security_level TEXT DEFAULT 'INFO'
    )
  `);

  // Force update existing product image URLs to local /images/ endpoints
  db.run("DELETE FROM products");
  db.run("DELETE FROM users");
  db.run("DELETE FROM orders");
  db.run("DELETE FROM order_items");

  console.log("Seeding fresh database records with high quality generated product images...");
  
  const adminPass = bcrypt.hashSync('admin123', 8);
  const userPass = bcrypt.hashSync('password123', 8);
  const alicePass = bcrypt.hashSync('alice2026!', 8);

  db.run(`INSERT INTO users (username, email, password, role) VALUES 
    ('admin', 'admin@secureshop.local', ?, 'admin'),
    ('john_doe', 'john@secureshop.local', ?, 'user'),
    ('alice_smith', 'alice@secureshop.local', ?, 'user')
  `, [adminPass, userPass, alicePass]);

  db.run(`INSERT INTO products (id, name, description, category, price, stock, image_url) VALUES
    (1, 'CyberShield Pro VPN Router', 'Hardware-encrypted gigabit router with integrated firewall and wireguard protocol support.', 'Hardware', 199.99, 45, '/images/router.png'),
    (2, 'Encrypted YubiKey 5C NFC', 'Dual-protocol hardware security key for multi-factor authentication (FIDO2/WebAuthn).', 'Hardware', 55.00, 120, '/images/key.png'),
    (3, 'StealthOps Mechanical Keyboard', 'Low-profile wireless mechanical keyboard with customizable RGB & hardware encryption.', 'Accessories', 149.50, 30, '/images/keyboard.png'),
    (4, 'AppSec Auditor Suite v4', 'Automated static code security scanning software license with real-time vulnerability detection.', 'Software', 299.00, 999, '/images/software.png'),
    (5, 'Faraday Shield Laptop Sleeve', 'Military-grade RFID & Signal Blocking Faraday Pouch for laptops up to 16 inches.', 'Accessories', 42.99, 85, '/images/sleeve.png'),
    (6, 'Zero-Trust Gateway Hub', 'Edge security gateway device with micro-segmentation and intrusion prevention system.', 'Hardware', 349.99, 15, '/images/hub.png')
  `);

  // Seed Orders
  db.run(`INSERT INTO orders (id, user_id, total_amount, shipping_address, payment_status) VALUES
    (1001, 2, 254.99, '122 Security Blvd, Cyber City, NY 10001', 'Completed'),
    (1002, 3, 55.00, '404 Red Team Way, Hacker Town, CA 90210', 'Completed'),
    (1003, 1, 498.99, '999 Admin HQ, Suite 10, SecOps, TX 75001', 'Completed')
  `);

  db.run(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
    (1001, 1, 1, 199.99),
    (1001, 2, 1, 55.00),
    (1002, 2, 1, 55.00),
    (1003, 4, 1, 299.00),
    (1003, 1, 1, 199.99)
  `);

  console.log("Database updated with local image routes successfully!");
});

module.exports = db;

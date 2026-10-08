const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
let PORT = process.env.PORT || 8080;

// Ensure public/images directory exists and copy generated product images into place
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const brainDir = path.join('C:', 'Users', 'nikhi', '.gemini', 'antigravity', 'brain', 'bdd43017-1f42-4a5b-b66f-16e5142183b4');
const imageMap = {
  'router.png': 'vpn_router_1791436596984.png',
  'key.png': 'security_key_1791436622794.png',
  'keyboard.png': 'mechanical_keyboard_1791436648515.png',
  'software.png': 'auditor_software_1791436687677.png',
  'sleeve.png': 'faraday_sleeve_1791436721172.png',
  'hub.png': 'zero_trust_hub_1791436753495.png'
};

for (const [targetName, srcName] of Object.entries(imageMap)) {
  const srcPath = path.join(brainDir, srcName);
  const destPath = path.join(imagesDir, targetName);
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
    } catch (e) {
      console.error(`Note: Could not copy ${srcName}:`, e.message);
    }
  }
}

// Global Lab Security Mode State: 'vulnerable' | 'remediated'
let labSecurityMode = 'vulnerable';

// JWT Configuration
const VULNERABLE_JWT_SECRET = 'secureshop-secret-123'; // Weak hardcoded secret
const REMEDIATED_JWT_SECRET = process.env.JWT_SECRET || 'a8f9c1e7d2b456301298471abcfe9087123984712039487102938471239847';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Dynamic Security Header Middleware (A05: Security Misconfiguration)
app.use((req, res, next) => {
  if (labSecurityMode === 'remediated') {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:;");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
  } else {
    res.setHeader('X-Powered-By', 'Express/4.18.2 (Node.js/v18.16.0)');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
  }
  next();
});

// Custom Dynamic Route for Image Serving fallback
app.get('/images/:filename', (req, res) => {
  const requestedFile = req.params.filename;
  const localPath = path.join(imagesDir, requestedFile);
  
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // Fallback to brain directory if present
  const mappedBrainFile = imageMap[requestedFile];
  if (mappedBrainFile) {
    const brainPath = path.join(brainDir, mappedBrainFile);
    if (fs.existsSync(brainPath)) {
      return res.sendFile(brainPath);
    }
  }

  res.status(404).send('Image not found');
});

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware: Authentication & Token Verification (A07 & A01)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    if (labSecurityMode === 'vulnerable') {
      req.user = null;
      return next();
    }
    return res.status(401).json({ status: 'error', message: 'Authentication required. Token missing.' });
  }

  if (labSecurityMode === 'vulnerable') {
    try {
      const decoded = jwt.decode(token);
      req.user = decoded || { id: 2, username: 'anonymous', role: 'user' };
      next();
    } catch (e) {
      req.user = { id: 2, username: 'john_doe', role: 'user' };
      next();
    }
  } else {
    jwt.verify(token, REMEDIATED_JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
      if (err) return res.status(403).json({ status: 'error', message: 'Invalid or expired token.' });
      req.user = user;
      next();
    });
  }
};

// Log Security Audit Events (A09)
function logAuditEvent(eventType, username, ip, details, securityLevel = 'INFO') {
  db.run(
    `INSERT INTO audit_logs (event_type, username, ip_address, details, security_level) VALUES (?, ?, ?, ?, ?)`,
    [eventType, username || 'Anonymous', ip || '127.0.0.1', details, securityLevel]
  );
}

// -------------------------------------------------------------
// LAB CONTROL PANEL API ROUTES
// -------------------------------------------------------------

app.get('/api/security/mode', (req, res) => {
  res.json({
    status: 'success',
    mode: labSecurityMode,
    outdatedComponents: [
      { name: 'lodash', version: '4.17.11', cve: 'CVE-2019-10744', severity: 'HIGH', impact: 'Prototype Pollution' },
      { name: 'jsonwebtoken', version: '8.5.1', cve: 'CVE-2022-23529', severity: 'CRITICAL', impact: 'Insecure Signature Verification' },
      { name: 'ejs', version: '3.1.5', cve: 'CVE-2022-29078', severity: 'CRITICAL', impact: 'Server-Side Template Injection (SSTI)' }
    ]
  });
});

app.post('/api/security/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'vulnerable' || mode === 'remediated') {
    labSecurityMode = mode;
    logAuditEvent('SECURITY_MODE_CHANGE', 'system', req.ip, `Lab mode changed to: ${mode.toUpperCase()}`, 'WARNING');
    return res.json({ status: 'success', mode: labSecurityMode, message: `Lab security mode updated to: ${labSecurityMode.toUpperCase()}` });
  }
  res.status(400).json({ status: 'error', message: "Invalid mode. Use 'vulnerable' or 'remediated'." });
});

app.get('/api/security/audit-logs', (req, res) => {
  db.all('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50', (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', logs: rows });
  });
});

// -------------------------------------------------------------
// PUBLIC & APPLICATION API ROUTES
// -------------------------------------------------------------

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (labSecurityMode === 'vulnerable') {
    console.log(`[VULNERABLE LOG] User Attempted Login -> Username: ${username}, Password: ${password}`);
    logAuditEvent('LOGIN_ATTEMPT', username, req.ip, `User login attempt with password: ${password}`, 'WARNING');
  } else {
    console.log(`[SECURE LOG] User Attempted Login -> Username: ${username}, Password: [REDACTED]`);
    logAuditEvent('LOGIN_ATTEMPT', username, req.ip, `Login attempt for user: ${username}`, 'INFO');
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }

    const isValidPass = bcrypt.compareSync(password, user.password);
    if (!isValidPass) {
      logAuditEvent('LOGIN_FAILED', username, req.ip, 'Invalid credentials entered.', 'WARNING');
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }

    const secret = labSecurityMode === 'vulnerable' ? VULNERABLE_JWT_SECRET : REMEDIATED_JWT_SECRET;
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, email: user.email },
      secret,
      { expiresIn: '2h' }
    );

    logAuditEvent('LOGIN_SUCCESS', username, req.ip, `User logged in successfully as role: ${user.role}`, 'INFO');

    res.json({
      status: 'success',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  });
});

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  db.run(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, hashedPassword, 'user'],
    function (err) {
      if (err) {
        return res.status(400).json({ status: 'error', message: 'Username or email already exists.' });
      }
      logAuditEvent('USER_REGISTERED', username, req.ip, 'New user account created.', 'INFO');
      res.json({ status: 'success', message: 'User registered successfully. You can now login.' });
    }
  );
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', products: rows });
  });
});

app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ status: 'error', message: 'Product not found.' });
    }
    res.json({ status: 'success', product });
  });
});

app.get('/api/products/search', (req, res) => {
  const query = req.query.q || '';

  if (labSecurityMode === 'vulnerable') {
    const sql = `SELECT * FROM products WHERE name LIKE '%${query}%' OR category LIKE '%${query}%'`;
    console.log(`[VULNERABLE SQL QUERY EXECUTION]: ${sql}`);

    db.all(sql, (err, rows) => {
      if (err) {
        return res.status(500).json({
          status: 'error',
          vulnerability: 'SQL_INJECTION_AND_VERBOSE_ERROR',
          message: 'Database Execution Failure',
          sqlError: err.message,
          rawQuery: sql,
          stackTrace: err.stack
        });
      }
      res.json({
        status: 'success',
        query,
        executedSql: sql,
        products: rows
      });
    });
  } else {
    const sql = `SELECT * FROM products WHERE name LIKE ? OR category LIKE ?`;
    const searchParam = `%${query}%`;

    db.all(sql, [searchParam, searchParam], (err, rows) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: 'An internal server error occurred.' });
      }
      res.json({
        status: 'success',
        query,
        products: rows
      });
    });
  }
});

app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    if (labSecurityMode === 'vulnerable') {
      db.all(
        `SELECT order_items.*, products.name, products.image_url 
         FROM order_items 
         JOIN products ON order_items.product_id = products.id 
         WHERE order_items.order_id = ?`,
        [orderId],
        (errItems, items) => {
          res.json({
            status: 'success',
            vulnerabilityWarning: 'IDOR Vulnerability Active - No Ownership Verification Executed!',
            order: { ...order, items }
          });
        }
      );
    } else {
      if (!req.user || (req.user.id !== order.user_id && req.user.role !== 'admin')) {
        logAuditEvent('UNAUTHORIZED_ACCESS_ATTEMPT', req.user ? req.user.username : 'Guest', req.ip, `Attempted unauthorized access to Order #${orderId}`, 'WARNING');
        return res.status(403).json({
          status: 'error',
          message: 'Access Denied: You do not have permission to view this order.'
        });
      }

      db.all(
        `SELECT order_items.*, products.name, products.image_url 
         FROM order_items 
         JOIN products ON order_items.product_id = products.id 
         WHERE order_items.order_id = ?`,
        [orderId],
        (errItems, items) => {
          res.json({
            status: 'success',
            order: { ...order, items }
          });
        }
      );
    }
  });
});

app.get('/api/orders/user/:userId', authenticateToken, (req, res) => {
  const requestedUserId = req.params.userId;

  if (labSecurityMode === 'remediated') {
    if (req.user.id != requestedUserId && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Access Denied. Cannot view another user order history.' });
    }
  }

  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [requestedUserId], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', orders: rows });
  });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { items, shippingAddress } = req.body;
  const userId = req.user ? req.user.id : 2;

  if (!items || !items.length) {
    return res.status(400).json({ status: 'error', message: 'Cart items cannot be empty.' });
  }

  let total = 0;
  items.forEach(item => {
    total += item.price * item.quantity;
  });

  db.run(
    'INSERT INTO orders (user_id, total_amount, shipping_address, payment_status) VALUES (?, ?, ?, ?)',
    [userId, total.toFixed(2), shippingAddress || 'Standard Delivery', 'Completed'],
    function (err) {
      if (err) return res.status(500).json({ status: 'error', message: err.message });

      const newOrderId = this.lastID;
      const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
      
      items.forEach(item => {
        stmt.run(newOrderId, item.id, item.quantity, item.price);
      });
      stmt.finalize();

      logAuditEvent('ORDER_CREATED', req.user ? req.user.username : 'User', req.ip, `New Order #${newOrderId} placed total: $${total.toFixed(2)}`, 'INFO');

      res.json({
        status: 'success',
        message: 'Order placed successfully!',
        orderId: newOrderId,
        totalAmount: total.toFixed(2)
      });
    }
  );
});

app.get('/api/admin/users', authenticateToken, (req, res) => {
  if (labSecurityMode === 'vulnerable') {
    db.all('SELECT id, username, email, role, created_at FROM users', (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      res.json({
        status: 'success',
        vulnerabilityWarning: 'VULNERABLE: Unauthenticated / Unrestricted Admin Route Exposure!',
        users: rows
      });
    });
  } else {
    if (!req.user || req.user.role !== 'admin') {
      logAuditEvent('UNAUTHORIZED_ADMIN_ATTEMPT', req.user ? req.user.username : 'Anonymous', req.ip, 'Attempted to access Admin User Directory', 'WARNING');
      return res.status(403).json({
        status: 'error',
        message: 'Access Denied: Administrator privileges required.'
      });
    }

    db.all('SELECT id, username, email, role, created_at FROM users', (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      res.json({ status: 'success', users: rows });
    });
  }
});

app.post('/api/admin/products', authenticateToken, (req, res) => {
  if (labSecurityMode === 'remediated' && (!req.user || req.user.role !== 'admin')) {
    return res.status(403).json({ status: 'error', message: 'Admin role required.' });
  }

  const { name, description, category, price, stock, image_url } = req.body;
  db.run(
    'INSERT INTO products (name, description, category, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, category, price, stock || 50, image_url || '/images/software.png'],
    function (err) {
      if (err) return res.status(400).json({ status: 'error', message: err.message });
      res.json({ status: 'success', message: 'Product added successfully', productId: this.lastID });
    }
  );
});

// Fallback Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server with Graceful EADDRINUSE Fallback
function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`=======================================================`);
    console.log(` SecureShop AppSec Lab running at: http://localhost:${portToTry}`);
    console.log(` Initial Lab Mode: ${labSecurityMode.toUpperCase()}`);
    console.log(` Red Team Mission: Build -> Attack -> Identify -> Fix -> Retest`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[NOTICE] Port ${portToTry} is already in use by a running process.`);
      const nextPort = portToTry + 1;
      console.log(`Attempting to bind SecureShop to port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Server execution error:', err);
    }
  });
}

startServer(PORT);

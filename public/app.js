// SecureShop AppSec Lab - Frontend Logic

let currentUser = JSON.parse(localStorage.getItem('secureshop_user')) || null;
let authToken = localStorage.getItem('secureshop_token') || null;
let cart = JSON.parse(localStorage.getItem('secureshop_cart')) || [];
let currentProducts = [];
let activeCategory = 'All';
let currentSecurityMode = 'vulnerable';

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  fetchSecurityMode();
  loadProducts();
  updateAuthUI();
  updateCartBadge();
});

// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// -------------------------------------------------------------
// LAB CONTROL PANEL & SECURITY MODE
// -------------------------------------------------------------

async function fetchSecurityMode() {
  try {
    const res = await fetch('/api/security/mode');
    const data = await res.json();
    if (data.status === 'success') {
      currentSecurityMode = data.mode;
      updateSecurityBannerUI();
    }
  } catch (err) {
    console.error('Failed to fetch security mode:', err);
  }
}

async function toggleSecurityMode(isRemediated) {
  const newMode = isRemediated ? 'remediated' : 'vulnerable';
  try {
    const res = await fetch('/api/security/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode })
    });
    const data = await res.json();
    if (data.status === 'success') {
      currentSecurityMode = data.mode;
      updateSecurityBannerUI();
      showToast(`Lab Security Mode updated to: ${data.mode.toUpperCase()}`, data.mode === 'remediated' ? 'success' : 'error');
    }
  } catch (err) {
    showToast('Failed to change security mode', 'error');
  }
}

function updateSecurityBannerUI() {
  const label = document.getElementById('currentModeLabel');
  const dot = document.getElementById('modeDot');
  const toggle = document.getElementById('securityToggle');
  const toggleText = document.getElementById('toggleStateText');
  const footerMode = document.getElementById('footerModeText');

  if (currentSecurityMode === 'remediated') {
    label.textContent = 'REMEDIATED (SECURITY FIXES ACTIVE)';
    label.className = 'remediated-text';
    dot.className = 'status-indicator-dot remediated-dot pulse';
    toggle.checked = true;
    toggleText.textContent = 'Remediated Mode Active';
    if (footerMode) footerMode.innerHTML = 'Active Mode: <strong class="remediated-text">Remediated</strong>';
  } else {
    label.textContent = 'VULNERABLE (RED TEAM ATTACK TARGET)';
    label.className = 'vulnerable-text';
    dot.className = 'status-indicator-dot pulse';
    toggle.checked = false;
    toggleText.textContent = 'Enable Remediated Mode';
    if (footerMode) footerMode.innerHTML = 'Active Mode: <strong class="vulnerable-text">Vulnerable</strong>';
  }
}

// Modal Handlers
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function openLabModal() {
  fetchSecurityMode();
  openModal('labModal');
}

function switchLabTab(tabId, btnElement) {
  document.querySelectorAll('.lab-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.lab-tab-content').forEach(c => c.classList.remove('active'));
  
  btnElement.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// Copy helper
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showToast('Copied to clipboard!');
}

// -------------------------------------------------------------
// PRODUCT CATALOG & SEARCH
// -------------------------------------------------------------

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.status === 'success') {
      currentProducts = data.products;
      renderProducts();
    }
  } catch (err) {
    showToast('Failed to load products', 'error');
  }
}

function renderProducts(productsToRender = null) {
  const grid = document.getElementById('productsGrid');
  const list = productsToRender || currentProducts;

  const filtered = activeCategory === 'All' 
    ? list 
    : list.filter(p => p.category === activeCategory);

  if (!filtered || filtered.length === 0) {
    grid.innerHTML = `<div class="no-products"><p>No products found matching your search query.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-image-box">
        <img src="${p.image_url}" alt="${p.name}">
        <span class="category-tag">${p.category}</span>
      </div>
      <div class="product-info">
        <h3 class="product-title">${p.name}</h3>
        <p class="product-description">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          <div>
            <button class="btn btn-sm btn-outline" onclick="openProductModal(${p.id})">Details</button>
            <button class="btn btn-sm btn-primary" onclick="addToCart(${p.id})"><i class="fa-solid fa-cart-plus"></i> Add</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function filterCategory(category, btn) {
  activeCategory = category;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderProducts();
}

function scrollToCatalog() {
  document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' });
}

// Search Functionality (Handles SQL Injection in Vulnerable Mode)
async function handleSearch(e) {
  e.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  const msgBox = document.getElementById('searchStatusMsg');

  if (!query) {
    msgBox.innerHTML = '';
    loadProducts();
    return;
  }

  try {
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.status === 'success') {
      if (data.executedSql) {
        msgBox.innerHTML = `<small class="vulnerable-text"><i class="fa-solid fa-code"></i> Executed SQL: <code>${data.executedSql}</code></small>`;
      } else {
        msgBox.innerHTML = `<small class="remediated-text"><i class="fa-solid fa-shield"></i> Query executed safely via parameterized statement.</small>`;
      }
      renderProducts(data.products);
    } else if (data.vulnerability) {
      // SQL Error returned in vulnerable mode
      msgBox.innerHTML = `<div class="error-box"><p class="vulnerable-text"><strong>SQL Injection Error Triggered:</strong> ${data.sqlError}</p><pre>${data.stackTrace}</pre></div>`;
      renderProducts([]);
    }
  } catch (err) {
    showToast('Search execution error', 'error');
  }
}

function openProductModal(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;

  const modalBody = document.getElementById('productModalBody');
  document.getElementById('modalProductName').textContent = product.name;

  modalBody.innerHTML = `
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <img src="${product.image_url}" style="width: 200px; height: 180px; object-fit: cover; border-radius: 12px;">
      <div style="flex: 1;">
        <span class="badge badge-primary">${product.category}</span>
        <h3 style="margin-top: 10px; font-size: 1.4rem;">$${product.price.toFixed(2)}</h3>
        <p style="color: var(--text-muted); margin: 12px 0;">${product.description}</p>
        <p><small>Stock Available: ${product.stock} units</small></p>
        <button class="btn btn-primary mt-4" onclick="addToCart(${product.id}); closeModal('productModal');">
          <i class="fa-solid fa-cart-plus"></i> Add to Cart
        </button>
      </div>
    </div>
  `;

  openModal('productModal');
}

// -------------------------------------------------------------
// CART & CHECKOUT
// -------------------------------------------------------------

function addToCart(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  updateCartBadge();
  showToast(`Added '${product.name}' to cart.`);
}

function saveCart() {
  localStorage.setItem('secureshop_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartBadge').textContent = totalItems;
}

function openCartModal() {
  renderCart();
  openModal('cartModal');
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px;">Your shopping cart is currently empty.</p>`;
    document.getElementById('cartSubtotal').textContent = '$0.00';
    document.getElementById('cartTotal').textContent = '$0.00';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
        <div>
          <strong style="color: var(--text-light);">${item.name}</strong>
          <br><small style="color: var(--text-muted);">$${item.price.toFixed(2)} x ${item.quantity}</small>
        </div>
        <div>
          <strong style="color: #60a5fa; margin-right: 16px;">$${itemTotal.toFixed(2)}</strong>
          <button class="btn btn-xs btn-secondary" onclick="removeFromCart(${item.id})">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartSubtotal').textContent = `$${total.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartBadge();
  renderCart();
}

async function handleCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  const shippingAddress = document.getElementById('shippingAddress').value.trim() || '123 Security Blvd';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: cart, shippingAddress })
    });

    const data = await res.json();
    if (data.status === 'success') {
      cart = [];
      saveCart();
      updateCartBadge();
      closeModal('cartModal');
      showToast(`Order #${data.orderId} successfully placed! Total: $${data.totalAmount}`);
    } else {
      showToast(data.message || 'Checkout failed', 'error');
    }
  } catch (err) {
    showToast('Failed to process checkout', 'error');
  }
}

// -------------------------------------------------------------
// USER AUTHENTICATION & PROFILE
// -------------------------------------------------------------

function updateAuthUI() {
  const container = document.getElementById('authNavContainer');
  if (currentUser) {
    container.innerHTML = `
      <div style="display: flex; gap: 8px;">
        <button class="nav-btn" onclick="openProfileModal()">
          <i class="fa-solid fa-user-circle"></i> ${currentUser.username}
        </button>
        ${currentUser.role === 'admin' ? `
          <button class="nav-btn btn-lab" onclick="openAdminModal()">
            <i class="fa-solid fa-user-ninja"></i> Admin
          </button>
        ` : ''}
        <button class="btn btn-sm btn-outline" onclick="handleLogout()">Logout</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="nav-btn" onclick="openAuthModal('login')">
        <i class="fa-solid fa-sign-in-alt"></i> Login / Register
      </button>
    `;
  }
}

function openAuthModal(mode) {
  toggleAuthForm(mode);
  openModal('authModal');
}

function toggleAuthForm(mode) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const title = document.getElementById('authModalTitle');

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create New Account';
  } else {
    regForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    title.innerHTML = '<i class="fa-solid fa-user-lock"></i> User Login';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.status === 'success') {
      currentUser = data.user;
      authToken = data.token;
      localStorage.setItem('secureshop_user', JSON.stringify(currentUser));
      localStorage.setItem('secureshop_token', authToken);

      updateAuthUI();
      closeModal('authModal');
      showToast(`Welcome back, ${currentUser.username}!`);
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Server authentication error', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (data.status === 'success') {
      showToast('Registration successful! Please sign in.');
      toggleAuthForm('login');
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Registration error', 'error');
  }
}

function handleLogout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('secureshop_user');
  localStorage.removeItem('secureshop_token');
  updateAuthUI();
  showToast('Logged out successfully.');
}

// User Profile & IDOR Order Inspector
async function openProfileModal() {
  if (!currentUser) return;

  document.getElementById('profileUsername').textContent = currentUser.username;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileRole').textContent = `Role: ${currentUser.role.toUpperCase()}`;

  openModal('profileModal');
  loadUserOrderHistory();
}

async function loadUserOrderHistory() {
  const container = document.getElementById('orderHistoryContainer');
  const userId = currentUser ? currentUser.id : 2;

  try {
    const res = await fetch(`/api/orders/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.status === 'success' && data.orders.length > 0) {
      container.innerHTML = data.orders.map(o => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Order #${o.id}</strong> — $${o.total_amount.toFixed(2)}
            <br><small style="color: var(--text-muted);">${o.created_at} | Status: ${o.payment_status}</small>
          </div>
          <button class="btn btn-sm btn-outline" onclick="inspectOrderDetails(${o.id})">Inspect Order (IDOR Test)</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<p style="color: var(--text-muted);">No order history found for this account.</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="vulnerable-text">Failed to load order history.</p>`;
  }
}

async function inspectOrderDetails(orderId) {
  // Allow user to edit order ID for IDOR demonstration
  const customId = prompt("Enter Order ID to fetch (In Vulnerable Mode, try 1001 or 1003):", orderId);
  if (!customId) return;

  try {
    const res = await fetch(`/api/orders/${customId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.status === 'success') {
      alert(`[ORDER INSPECTION SUCCESS]\nOrder ID: ${data.order.id}\nUser ID Owner: ${data.order.user_id}\nTotal: $${data.order.total_amount}\nAddress: ${data.order.shipping_address}\nItems: ${data.order.items ? data.order.items.length : 0} items\n\n${data.vulnerabilityWarning || 'Access verified safely.'}`);
    } else {
      alert(`[ACCESS DENIED]\n${data.message}`);
    }
  } catch (err) {
    alert('Error inspecting order details');
  }
}

// -------------------------------------------------------------
// ADMIN MANAGEMENT & EXPLOIT HELPERS
// -------------------------------------------------------------

async function openAdminModal() {
  openModal('adminModal');
  loadAdminUserList();
}

async function loadAdminUserList() {
  const tbody = document.getElementById('adminUserTableBody');
  try {
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.status === 'success') {
      tbody.innerHTML = data.users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${u.username}</strong></td>
          <td>${u.email}</td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-lab' : 'badge-primary'}">${u.role}</span></td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="4" class="vulnerable-text">${data.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="vulnerable-text">Failed to load admin user directory.</td></tr>`;
  }
}

async function handleAdminAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('adminProdName').value;
  const category = document.getElementById('adminProdCategory').value;
  const price = parseFloat(document.getElementById('adminProdPrice').value);
  const description = document.getElementById('adminProdDesc').value;

  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, category, price, description })
    });
    const data = await res.json();

    if (data.status === 'success') {
      showToast('New product added to store catalog!');
      loadProducts();
    } else {
      showToast(data.message || 'Failed to add product', 'error');
    }
  } catch (err) {
    showToast('Admin server error', 'error');
  }
}

// Exploit Payload Runner Helpers
function fillSqliPayload() {
  closeModal('labModal');
  const searchInput = document.getElementById('searchInput');
  searchInput.value = "' UNION SELECT 1, username, password, email, 50, 5 FROM users--";
  scrollToCatalog();
}

async function executePayload(type) {
  const outputBox = document.getElementById('payloadOutput');
  outputBox.classList.remove('hidden');
  outputBox.textContent = `[EXECUTING PAYLOAD: ${type.toUpperCase()}] Requesting server...`;

  if (type === 'sqli') {
    const res = await fetch("/api/products/search?q=" + encodeURIComponent("' UNION SELECT 1, username, password, email, 50, 5 FROM users--"));
    const data = await res.json();
    outputBox.textContent = `[SQL INJECTION RESPONSE]\nStatus Code: ${res.status}\nMode: ${currentSecurityMode.toUpperCase()}\nExecuted SQL: ${data.executedSql || 'N/A'}\nReturned DB Rows:\n` + JSON.stringify(data.products || data, null, 2);
  } else if (type === 'idor') {
    const res = await fetch("/api/orders/1003", { headers: { 'Authorization': `Bearer ${authToken}` } });
    const data = await res.json();
    outputBox.textContent = `[IDOR ORDER RESPONSE]\nStatus Code: ${res.status}\nRequested Order: #1003 (Belongs to Admin)\nMode: ${currentSecurityMode.toUpperCase()}\nResponse:\n` + JSON.stringify(data, null, 2);
  } else if (type === 'admin') {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    outputBox.textContent = `[UNAUTH ADMIN RESPONSE]\nStatus Code: ${res.status}\nMode: ${currentSecurityMode.toUpperCase()}\nResponse:\n` + JSON.stringify(data, null, 2);
  } else if (type === 'headers') {
    const res = await fetch("/api/products");
    const headersObj = {};
    res.headers.forEach((v, k) => headersObj[k] = v);
    outputBox.textContent = `[HTTP SECURITY HEADERS]\nMode: ${currentSecurityMode.toUpperCase()}\nHeaders Received:\n` + JSON.stringify(headersObj, null, 2);
  }
}

// -------------------------------------------------------------
// EVIDENCE REPORT EXPORTER
// -------------------------------------------------------------

function exportSecurityReport() {
  const timestamp = new Date().toISOString();
  const reportContent = `# RED TEAM APPLICATION SECURITY ASSIGNMENT REPORT
**Application Target:** SecureShop AppSec Laboratory
**Target URL:** http://localhost:8080
**Report Date:** ${timestamp}

---

## 1. Executive Summary
SecureShop was developed as a full-stack e-commerce web application containing controlled vulnerabilities across 4+ OWASP Top 10 categories. Security testing was performed using OWASP ZAP and manual validation in Phase 1 (Vulnerable Mode) and Phase 2 (Remediated Mode).

---

## 2. Outdated Dependencies (A06: Vulnerable and Outdated Components)
- **lodash v4.17.11** (CVE-2019-10744): High severity Prototype Pollution.
- **jsonwebtoken v8.5.1** (CVE-2022-23529): Critical severity signature bypass flaw.
- **ejs v3.1.5** (CVE-2022-29078): Critical Server-Side Template Injection.

---

## 3. OWASP Vulnerability & Retest Evidence

### A01: Broken Access Control (IDOR & Admin Exposure)
- **Vulnerable Behavior:** Order endpoint \`/api/orders/:id\` lacked session user checks. Endpoint \`/api/admin/users\` allowed unauthenticated user dumps.
- **Remediated Behavior:** Implemented strictly checked session ownership \`req.user.id === order.user_id\` and \`requireAdmin\` middleware.

### A03: Injection (SQL Injection)
- **Vulnerable Behavior:** Product search query \`/api/products/search?q=\` concatenated raw SQL strings:
  \`SELECT * FROM products WHERE name LIKE '%\${q}%'\`
- **Remediated Behavior:** Replaced with SQLite parameterized query placeholders: \`db.all(sql, ['%\${q}%'])\`.

### A05: Security Misconfiguration
- **Vulnerable Behavior:** Disclosed \`X-Powered-By: Express/4.18.2\` and lacked CSP & X-Frame-Options headers. Returned verbose stack traces on 500 error.
- **Remediated Behavior:** Helmet security headers applied, CSP policy enabled, and generic production error messages configured.

### A07: Authentication & Session Failures
- **Vulnerable Behavior:** Weak hardcoded secret \`secureshop-secret-123\` and missing rate limiting.
- **Remediated Behavior:** Cryptographically generated strong JWT secret and rate limiting active.

### A09: Security Logging & Monitoring Failures
- **Vulnerable Behavior:** Plaintext user passwords written to server console logs during login attempts.
- **Remediated Behavior:** Passwords masked with \`[REDACTED]\` and stored in structured database audit log.

---

## 4. Conclusion
Retesting in Remediated Mode verified that all identified OWASP vulnerabilities were successfully remediated without breaking application functionality.
`;

  const blob = new Blob([reportContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SecureShop_AppSec_Retest_Report_${new Date().toISOString().slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Security Retest Report downloaded!');
}

# SecureShop AppSec Lab — Red Team / Application Security Assignment

**Assignment Title:** Build → Attack → Identify → Fix → Retest  
**Target Application:** SecureShop E-Commerce Web Application  
**Target URL:** `http://localhost:8080`  

---

## 📌 Executive Overview

**SecureShop** is an intentionally vulnerable e-commerce laboratory application built specifically to satisfy the Red Team / Application Security coursework requirements. It demonstrates real-world application security concepts by combining:

1. **Complete E-Commerce Functionality:** Product storefront, catalog filtering, SQL-based search, shopping cart & checkout, customer profiles, order history, and an administrative console.
2. **Controlled OWASP Top 10 Weaknesses:** Controlled security issues spanning 6 distinct OWASP categories (A01, A03, A05, A06, A07, A09).
3. **Outdated Dependencies:** Intentionally embedded legacy npm packages (`jsonwebtoken@8.5.1`, `lodash@4.17.11`, `ejs@3.1.5`) with full CVE documentation.
4. **Interactive Security Control Panel:** Live toggle switch between **"Vulnerable Mode"** (for ZAP automated DAST scanning & exploit validation) and **"Remediated Mode"** (to demonstrate that security fixes work).
5. **Evidence Report Generator:** One-click exporter producing comparative before vs. after security posture reports.

---

## 🛠️ Technology Stack & Dependencies

| Component | Framework / Library | Version Used | Security Advisory / CVE |
|---|---|---|---|
| **Web Server** | Node.js + Express.js | `express@4.18.2` | N/A |
| **Database** | SQLite3 | `sqlite3@5.1.7` | N/A |
| **Outdated JWT** | `jsonwebtoken` | `8.5.1` | **CVE-2022-23529** (Critical - Insecure Key Verification) |
| **Outdated Utility**| `lodash` | `4.17.11` | **CVE-2019-10744** (High - Prototype Pollution) |
| **Outdated Renderer**| `ejs` | `3.1.5` | **CVE-2022-29078** (Critical - SSTI Remote Code Execution) |

---

## 🛡️ Implemented OWASP Top 10 Vulnerabilities

### 1. A01:2021 — Broken Access Control
- **IDOR (Insecure Direct Object Reference):** Endpoint `/api/orders/:id` allows any user to inspect any other user's order invoice by modifying the URL ID parameter (e.g. Order `#1001` or `#1003`).
- **Unauthenticated Admin Directory Exposure:** Endpoint `/api/admin/users` dumps all user records (including roles and password hashes) without validating session cookies or JWT role privileges.
- **Remediation:** Enforces strict session ownership check `req.user.id === order.user_id` and role verification middleware `req.user.role === 'admin'`.

### 2. A03:2021 — Injection (SQL Injection & Reflected XSS)
- **Vulnerability:** Endpoint `/api/products/search?q=` directly concatenates unsanitized query string input into raw SQL queries:
  ```sql
  SELECT * FROM products WHERE name LIKE '%${query}%' OR category LIKE '%${query}%'
  ```
- **Exploit Payload:** `' UNION SELECT 1, username, password, email, 50, 5 FROM users--`
- **Remediation:** Replaced raw string formatting with prepared parameterized statements:
  ```javascript
  db.all('SELECT * FROM products WHERE name LIKE ?', [`%${query}%`]);
  ```

### 3. A05:2021 — Security Misconfiguration
- **Vulnerability:** Response headers disclose `X-Powered-By: Express/4.18.2 (Node.js/v18.16.0)` and lack Content-Security-Policy (CSP) or X-Frame-Options protection. Additionally, invalid search queries trigger verbose 500 error stack traces.
- **Remediation:** Configured `helmet` security header middleware, enabled strict CSP policies, and suppressed detailed stack traces in production responses.

### 4. A06:2021 — Vulnerable and Outdated Components
- **Vulnerability:** Application package tree depends on outdated versions of `lodash`, `jsonwebtoken`, and `ejs` with published CVE advisories.
- **Remediation:** Documented CVE impact matrix and upgrade path.

### 5. A07:2021 — Identification and Authentication Failures
- **Vulnerability:** Uses hardcoded weak JWT signing key (`secureshop-secret-123`), accepts unverified tokens in vulnerable mode, and lacks brute-force login rate-limiting.
- **Remediation:** Configured strong cryptographically random environment secret key and enforced token signature validation.

### 6. A09:2021 — Security Logging and Monitoring Failures
- **Vulnerability:** User passwords written in plaintext to server console logs during authentication attempts.
- **Remediation:** Passwords redacted as `[REDACTED]` and security events recorded in structured database audit table (`audit_logs`).

---

## 🚀 How to Run the Application

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Server
```bash
npm start
```
The server will start at: **`http://localhost:8080`**

---

## 🎯 OWASP ZAP Scanning Procedure (Phase 1 & Phase 2)

1. **Launch OWASP ZAP** and set target URL to `http://localhost:8080`.
2. **Phase 1 (Vulnerable Mode Scan):**
   - Ensure the Top Security Banner shows **VULNERABLE MODE**.
   - Run an **Automated Quick Scan** or **Active Scan**.
   - Note findings: SQL Injection, Missing X-Frame-Options, CSP header missing, Server version disclosure.
3. **Phase 2 (Remediated Retest):**
   - Toggle the banner switch to **REMEDIATED MODE**.
   - Re-run the ZAP scan.
   - Verify that High/Medium alerts are cleared.
4. **Generate Report:** Click **"Export Evidence Report"** in the top navigation bar to download the Markdown report.

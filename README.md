# Smart Material & Inventory Management Platform (SMIMP)

SMIMP is an enterprise-grade, real-time Material Lifecycle and Inventory Management platform. It is designed to handle modern supply chain tracking, quality assurance, warehouse slotting, purchase ordering, and consignment logistics.

## Key Features

### 📦 Material & Inventory Management
*   Track materials with detailed attributes (SKU, categories, status, units, cost, location).
*   Automatic calculation of total inventory value and warning threshold indicators.
*   Log low stock alerts dynamically based on custom min-stock levels.
*   Log full history of stock transactions (`stock_in`, `stock_out`, `transfer`, `adjustment`, `return`, `disposal`).

### 🚚 Consignment Note (C-Note) Module
*   Track material shipments received directly from vendors.
*   Store dispatcher/transporter logs, vehicle numbers, dispatch dates, and actual arrival dates.
*   Correlate consignment details directly with existing materials and purchase orders.
*   Update status through stages: `draft`, `in_transit`, `received`, `verified`, `rejected`.

### 📝 Store Issue Voucher (SIV) Module
*   Handle material distribution requests issued to specific departments.
*   Multi-stage approval workflow:
    1.  **Draft/Request**: Created by departmental staff.
    2.  **Approve**: Authorized by administrator.
    3.  **Issue**: Warehousing staff confirms dispatch, triggering automatic stock level and value deduction in real time and logging inventory transactions.
*   Define status indicators: `pending`, `approved`, `issued`, `rejected`, `returned`.

### 🔬 Quality Control & Workflows
*   Stage-based workflow configuration (e.g. `received`, `under_review`, `quality_check`, `approved`, `stored`, `issued`).
*   Quality control inspection forms matching items to inspector, recording checklists, and logging pass/fail stats.

### 🏗️ Warehouses & Layouts
*   Define multiple warehouse blocks and divide them into specific zones, racks, shelves, and capacities.
*   Real-time stock movement records between warehouses or internal locations.

### 📋 Analytics & Reporting
*   Dashboard reporting showing live KPI counts, 6-month transaction trends (Recharts), and category pie breakdowns.
*   Export standard PDF, Excel (xlsx), and CSV files for:
    *   Materials Inventory Report
    *   Transaction History Report
    *   Quality Inspections Report
    *   Audit Logs Report
    *   C-Note Shipments Report
    *   Store Issue Voucher Distribution Report
*   Audit Log trail tracking every user transaction (`CREATE`, `UPDATE`, `DELETE`) with exact timestamps and previous/new value records.

### ⚙️ QR Code Printing & Scanning
*   Generate printable barcodes and QR codes for materials.
*   Built-in scan camera (HTML5-QRCode) for rapid inventory audits and checkouts.

---

## Technology Stack

### Backend
*   **Node.js & Express**: API web server.
*   **Knex.js**: Query builder with cross-database support.
*   **SQLite (better-sqlite3)**: Relational database used for local development. Supports switching to **PostgreSQL** in production by editing environmental flags.
*   **Socket.IO**: Real-time events broadcasting.
*   **PDFKit**: Programmatic PDF report design.
*   **ExcelJS**: Advanced spreadsheet document writing.
*   **JSON Web Tokens (JWT)**: Secure stateless sessions with automatic token refresh.

### Frontend
*   **React (v19)**: Core UI framework.
*   **Vite**: Frontend bundler.
*   **Vanilla CSS**: Premium dark-mode design system with variables, glassmorphic widgets, custom cards, custom animations, and responsive sidebars.
*   **Recharts**: Interactive dashboard charts.
*   **Axios**: HTTP API client with interceptors for automatic session token refresh.
*   **HTML5-QRCode**: Direct camera integration for QR scanning.

---

## Project Structure

```text
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Layouts (Sidebar, Header, Layout)
│   │   ├── context/        # Auth Context provider
│   │   ├── pages/          # Page components (cnotes, siv, reports, dashboard, etc.)
│   │   ├── services/       # Axios API client functions
│   │   └── App.jsx         # App router config
├── server/                 # Express backend API
│   ├── src/
│   │   ├── config/         # Database and database connector
│   │   ├── controllers/    # API controllers
│   │   ├── middleware/     # Authentication & audit log interceptors
│   │   ├── migrations/     # Database knex migrations and seed scripts
│   │   └── routes/         # API endpoint router
```

---

## Local Setup & Run Guide

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm (v9 or higher)

### Setup Database & Backend Server
1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables. Copy the sample variables:
    ```bash
    cp .env.example .env
    ```
    *(For local dev, SQLite is used out-of-the-box. The database file `smimp.db` will be created automatically in the server folder).*
4.  Start the backend developer server:
    ```bash
    npm run dev
    ```
    *On startup, the server automatically executes all database migrations and seeds initial sample records.*

### Setup Frontend Client
1.  Open a new terminal and navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite developer server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## Default Login Credentials

All seeded developer accounts use the default password: **`Admin@123`**

| Role | Username / Email | Department |
|---|---|---|
| **Super Admin** | `superadmin@smimp.com` | IT |
| **Org Admin** | `admin@bhel.in` | Administration |
| **Inventory Manager** | `inventory@bhel.in` | Stores |
| **Material Team** | `material@bhel.in` | Material Management |
| **DTG Team** | `dtg@bhel.in` | DTG |
| **Quality Manager** | `quality@bhel.in` | Quality Control |
| **Warehouse Manager** | `warehouse@bhel.in` | Warehouse |
| **Store Keeper** | `storekeeper@bhel.in` | Stores |
| **Viewer (Read-Only)** | `viewer@bhel.in` | Finance |

---

## Production Deployment & Builds
To build the static frontend assets for hosting on production servers:
```bash
cd client
npm run build
```
The output files will be compiled into the `client/dist` directory.

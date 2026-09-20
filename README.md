# 🥛 G.V. Milk Agency & POS

> **Universal Business Sales, Multi-Slab GST Billing, WhatsApp Sharing & Bluetooth Thermal Printing Web App**

A modern, offline-first Point of Sale (POS) and daily delivery billing management system tailored for milk agencies, dairy distribution businesses, and retail counters. Built with **React 18**, **Vite**, **Tailwind CSS v4**, and **Supabase PostgreSQL** with an automatic **IndexedDB** offline engine.

---

## ✨ Key Features

- **⚡ Fast POS & Delivery Billing**:
  - Quick walk-in retail billing and daily morning/evening delivery run invoicing.
  - Keyboard-optimized fast input with item autofill.
  - Previous balance tracking with auto-added outstanding dues.

- **📊 Product-Level GST & Accurate Tax Calculations**:
  - Configure GST rates individually per product (e.g., `0% Exempt` for fresh milk, `5%` for curd/paneer/butter, `12%`, `18%`).
  - Strict Indian GST compliant math: computes item taxable subtotal, line tax, and automatic 50-50 intrastate split (**CGST** and **SGST**).
  - Mixed-slab bills supported with full itemized breakdown.

- **🖨️ Thermal Receipt Printing**:
  - **Bluetooth ESC/POS Support**: Connect directly via Web Bluetooth to 58mm and 80mm portable thermal printers.
  - **Browser Thermal Print**: Clean, high-fidelity isolated iframe printing without UI clipping or headers/footers.
  - **PDF Receipt Export**: Compact thermal-style digital receipt generation.
  - Explicit line-item GST indicators and tax exemption notices (`GST (0% EXEMPT): ₹0.00`).

- **📲 One-Click WhatsApp Sharing**:
  - Formats receipts into clean, readable text bills and sends directly to customers via WhatsApp.

- **☁️ Real-time Cloud Sync & Offline-First Engine**:
  - Connects to Supabase PostgreSQL for live multi-device sync across counter PCs, tablets, and phones.
  - Automatic IndexedDB offline cache ensures the agency keeps running without internet; syncs automatically once back online.

- **🏪 Shop & Customer Ledger**:
  - Manage retail stores and customers, track payments (Paid, Partial, Unpaid), and monitor outstanding dues.

- **💾 Data Backup & Migration**:
  - Export and restore entire business databases to/from JSON with one click.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/), [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [GSAP](https://greensock.com/gsap/)
- **Local Storage**: IndexedDB via [`idb`](https://github.com/jakearchibald/idb)
- **Cloud Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Thermal Printing**: Web Bluetooth API + ESC/POS raw command buffer

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```
Add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
```

### 4. Database Setup (Supabase)
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Open [`supabase_schema.sql`](./supabase_schema.sql) from this repository, copy its contents, paste them into the SQL editor, and click **Run**.
4. All required tables, indexes, and migrations (`products`, `bills`, `shops`, `companies`, `settings`, `users`) will be set up automatically.

### 5. Run the Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Build & Deployment

### Build Locally
```bash
npm run build
```
This generates the optimized production bundle inside the `dist/` folder.

### Deploy to Vercel (Recommended)
1. Push your code to a GitHub repository.
2. Import the repository into [Vercel](https://vercel.com).
3. Set the build command to `npm run build` and output directory to `dist`.
4. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy**.

### Deploy to Netlify Drop
1. Run `npm run build`.
2. Drag and drop the `dist/` folder into [app.netlify.com/drop](https://app.netlify.com/drop).

---

## 📄 License
This project is private and intended for business use.

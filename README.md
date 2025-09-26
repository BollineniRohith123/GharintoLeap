# Gharinto Leap - Interior Design Marketplace

Gharinto Leap is a comprehensive, production-ready B2B platform designed to streamline the interior design industry in India. It connects customers, designers, project managers, and vendors within a unified and efficient ecosystem.

## ✨ Features

- **Multi-Role Architecture:** Tailored dashboards and permissions for Super Admins, Admins, Project Managers, Designers, Customers, and Vendors.
- **End-to-End Project Management:** From lead generation and conversion to project execution, milestone tracking, and completion.
- **Comprehensive Financial System:** Integrated digital wallets, credit management, payment processing, and financial analytics.
- **Vendor & Materials Marketplace:** A rich catalog of materials from a network of verified vendors.
- **Advanced RBAC:** A dynamic, database-driven Role-Based Access Control system for granular security.
- **Enterprise-Ready:** Built with security, scalability, and monitoring at its core.

---

## 🛠️ Technology Stack

- **Backend:** Node.js, TypeScript, Encore.dev, Express.js
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Database:** PostgreSQL
- **Authentication:** JWT with bcrypt hashing
- **Testing:** Bun Test Runner, Node-fetch

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Bun
- PostgreSQL
- Docker (optional)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd gharinto-leap
```
### 2. Install Dependencies

This is a monorepo using workspaces. Install all dependencies from the root.

```bash
bun install
```
### 3. Setup the Database

Ensure your PostgreSQL server is running.

```bash
# Create the development database
bun run db:setup
```

This command creates the `gharinto_dev` database and runs all migrations located in `backend/db/migrations/`.

### 4. Configure Environment Variables

Create a `.env` file in the `backend/` directory.

```env
# backend/.env
PORT=4000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/gharinto_dev
JWT_SECRET=a-very-strong-and-secret-key-for-development
NODE_ENV=development
```
### 5. Run the Application

Run the backend and frontend servers concurrently from the root directory.

```bash
bun run dev
```

Backend API will be available at `http://localhost:4000`

Frontend App will be available at `http://localhost:5173`

✅ Testing

The project includes a comprehensive suite for functional and performance testing.

```bash
# Run all tests (functional + performance)
bun test

# Run only functional API tests
bun test:functional

# Run a performance load test
bun test:load
```
# Never Stop Dreaming Trading

<p align="center">
  <img src="./public/nsd_light_logo.png" alt="Never Stop Dreaming Trading Logo" width="200" />
</p>

A high-performance, secure, and modern e-commerce platform built with **Next.js 16/15**, **React 19**, and **Supabase**. This system is designed for scalability, real-time updates, and robust administrative control.

---

## 🏗️ System Architecture

The platform leverages a serverless, event-driven architecture optimized for speed and security:

- **Frontend (Next.js & React)**: Utilizes the **App Router** with Server Components for optimal performance and SEO. The UI is built using **Tailwind CSS 4** and **Radix UI** primitives for accessibility and design consistency.
- **Backend-as-a-Service (Supabase)**:
    - **PostgreSQL Database**: Relational data storage with advanced indexing.
    - **Authentication**: Secure identity management with SMTP-based verified links (Nodemailer).
    - **Realtime**: Live order notifications and inventory updates using Postgres CDC.
    - **Row Level Security (RLS)**: Fine-grained access control at the database level.
- **Infrastructure**: Vercel-deployed with automated CI/CD, Edge Functions, and Image Optimization.

---

## 🛠️ Tech Stack

### Core
- **Next.js 16.1.0**: App Router, Server Actions, and PPR-ready architecture.
- **React 19**: Modern hook patterns and optimized rendering.
- **TypeScript**: Full-stack type safety.

### UI & Styling
- **Tailwind CSS 4.x**: Utility-first CSS with the latest design tokens.
- **Radix UI**: Accessible UI primitives (Accordion, Dialog, Select, etc.).
- **Lucide & Heroicons**: Scalable vector icons.
- **Embla Carousel**: Responsive and fluid product carousels.

### Data Management & Security
- **Supabase JS SDK**: Real-time DB and Auth integration.
- **Zod**: Runtime schema validation for API payloads and forms.
- **React Hook Form**: Performant form handling with Zod resolvers.
- **DOMPurify**: XSS protection for user-generated content.

### Logic & Reporting
- **Nodemailer**: Secure SMTP communication for transactional emails.
- **XLSX & jsPDF**: Professional report generation for admin exports.
- **Bad-words**: Automated content filtering for reviews and ratings.

---

## 🛡️ Security & Reliability

- **RLS Policies**: Every database query is restricted by user role and ownership.
- **Verified Link Auth**: Password resets and registrations are secured via unique, time-limited verification links.
- **Endpoint Health Checks**: Automated monitoring for system uptime and backend integrity.
- **Input Validation**: Strict Zod schemas for all client-to-server data transfers.
- **Philippine Phone Validation**: Centralized regex enforcement for local mobile formats.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase project with Auth and Database enabled

### Setup

1. **Install dependencies:**
    ```bash
    npm install
    ```

2. **Configure Environment Variables:**
   Create a `.env.local` file with the following placeholders:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (internal only)
    SMTP_HOST=your_smtp_host
    SMTP_PORT=your_smtp_port
    SMTP_USER=your_smtp_user
    SMTP_PASS=your_smtp_pass
    ```

3. **Database Migrations:**
   Run migrations in the Supabase SQL Editor:
    - `supabase/migrations/*.sql`

4. **Run Development Server:**
    ```bash
    npm run dev
    ```

---

## 📚 Technical Documentation

Explore the comprehensive technical guides in the `docs/` directory:

### 🏛️ Architecture & Infrastructure
- [Database Schema](./docs/DB_SCHEMA.md)
- [Deployment Strategy](./docs/DEPLOYMENT_STRATEGY.md)
- [Vercel Project Setup](./docs/VERCEL_PROJECT_SETUP.md)

### 🔐 Security & Core Logic
- [Authentication System](./docs/AUTHENTICATION.md)
- [Duplicate Order Prevention](./docs/DUPLICATE_ORDER_PREVENTION.md)
- [Address Validation Logic](./docs/ADDRESS_VALIDATION.md)
- [System Quality Audit](./System%20Reliability%20And%20Quality%20Audit.md)

### 🔌 Integrations
- [ERP Integration Blueprint](./docs/ERP_INTEGRATION_BLUEPRINT.md)
- [API Integration Specs](./docs/API_INTEGRATION.md)
- [Product Data Contract](./docs/ERP_PRODUCT_DATA_CONTRACT.md)

### 🛠️ Maintenance & DevOps
- [Migration Checklist](./docs/MIGRATION_CHECKLIST.md)
- [Troubleshooting Order Status](./docs/TROUBLESHOOTING_ORDER_STATUS.md)
- [Vercel Build Fixes](./docs/VERCEL_BUILD_FIX.md)

### 📦 Feature Deep-Dives
- [Order Management](./docs/ORDERS.md)
- [Product System](./docs/PRODUCTS.md)
- [Cart & Checkout](./docs/CART.md)
- [Real-time Notifications](./docs/NOTIFICATIONS.md)

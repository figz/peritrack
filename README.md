# PeriTrack — Perimenopause Symptom & Treatment Tracker

A private, single-user web application for logging perimenopause symptoms, tracking medications and HRT, recording biometrics, and visualizing trends over time.

---

## Prerequisites

- **Node.js** 18.17+ (recommended: 20 LTS)
- **Neon account** — free serverless PostgreSQL at [neon.tech](https://neon.tech)

---

## Local Development Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd peritrack-app
npm install
```

### 2. Create your Neon database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (format: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values.

### 4. Generate your admin password hash

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password_here', 10).then(h => console.log(h))"
```

Copy the output and set it as `ADMIN_PASSWORD_HASH` in `.env.local`.

### 5. Run database migrations and seed

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## Vercel Deployment

1. Push to GitHub/GitLab and connect to [Vercel](https://vercel.com/new).
2. Add these environment variables in Vercel:

| Key | Value |
|-----|-------|
| `ADMIN_USERNAME` | your username |
| `ADMIN_PASSWORD_HASH` | bcrypt hash |
| `DATABASE_URL` | Neon connection string |
| `NEXTAUTH_SECRET` | random 32+ char string |
| `NEXTAUTH_URL` | your Vercel URL |
| `SESSION_DURATION_DAYS` | `7` |
| `WEIGHT_UNIT` | `lbs` or `kg` |

3. After first deploy, run `npx prisma migrate deploy` in the Vercel build command or Neon console.

---

## Updating Your Admin Password

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NEW_PASSWORD', 10).then(h => console.log(h))"
```

Update `ADMIN_PASSWORD_HASH` in your environment variables.

---

## Adding Custom Symptoms

Go to **Settings → Symptoms → Add Custom**. Enter a snake_case key, display label, and optional category. The symptom appears in check-in forms immediately.

---

## Exporting & Backing Up Data

Go to **Settings → Data** and click **Export JSON** (full backup) or **Export CSV** (spreadsheet-friendly). Store JSON backups securely.

---

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + Radix UI (shadcn/ui)
- Prisma ORM + PostgreSQL (Neon)
- NextAuth.js credentials provider
- Recharts for data visualization

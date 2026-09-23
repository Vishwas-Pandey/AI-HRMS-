# AI-HRMS

A human resource management system with role-based access for **admin, HR, manager and employee**, covering employee records, attendance, payroll and performance reviews, plus HR tools built on Google's Gemini API.

Live demo: https://hr-management-system-eta-ten.vercel.app — use the one-click demo logins on the sign-in page (fictional company, resets daily).

## How accounts work

There is no public sign-up. The **admin** creates every account from the Employees page: they enter the person's details, choose the role (HR, Manager or Employee) and get back a generated **employee ID** (`EMP0001`, …) and a **temporary password** to hand over. On first sign-in the person must choose their own password before they can use anything else (enforced by the API, not just the UI). Anyone can change their password later from the account menu; an admin can reset a forgotten one, which issues a new temporary password.

| | Admin | HR | Manager | Employee |
| --- | :-: | :-: | :-: | :-: |
| Create accounts, assign/change roles, reset passwords, delete | ✓ | | | |
| View employee directory | ✓ | ✓ | ✓ (no salaries) | |
| Mark attendance for anyone | ✓ | ✓ | view only | |
| Create payroll, mark as paid | ✓ | view only | | |
| Write performance reviews | ✓ | ✓ | ✓ | |
| AI assistant, review sentiment, document drafts | ✓ | ✓ | ✓ | |
| AI resume screening, interview analysis | ✓ | ✓ | | |
| Own profile, check in/out, payslips, reviews | ✓ | ✓ | ✓ | ✓ |

## Features

- **Dashboards per role**: headcount, today's attendance, pending payroll, average rating, a 7-day attendance chart, headcount by department, recent reviews and Gemini insights; employees get a check-in card, latest payslip and feedback.
- **Employees**: searchable, filterable directory; profile pages with attendance, payroll and review tabs; create/edit with inline validation; one-time credentials dialog with copy buttons.
- **Attendance**: pick a day, mark Present/Absent/Leave per person (optimistic updates), bulk-mark the rest present; employees check themselves in and out. Days follow the company timezone (`COMPANY_TIMEZONE`, default Asia/Kolkata).
- **Payroll**: monthly records with deductions and computed net pay, mark-as-paid, filters; employees see and print their payslips.
- **Performance**: 1–5 star reviews with comments, rating distribution, no self-reviews.
- **AI tools** (Gemini 2.5 Flash): HR chat assistant, sentiment summary across all reviews, document drafts (offer letters, policies), resume screening against a job description (PDF upload), and interview analysis from recorded or uploaded audio. Without an API key these return a clear "not configured" message.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router 7, Tailwind CSS, lucide-react, Chart.js, react-markdown |
| Backend | Node.js 20, Express 5, Mongoose 8, JWT, bcrypt, Multer |
| AI | Google Gemini REST API |
| Tests / CI | Node test runner, Supertest, mongodb-memory-server, GitHub Actions |

## Project structure

```
backend/
  app.js                 Express app (CORS, JSON, routes, error handler) — imported by tests
  server.js              Connects to MongoDB, optionally seeds the demo, starts the server
  middleware/            protect (JWT + forced password change), restrictTo(roles), errors, uploads
  controllers/ routes/   auth, employees, attendance, payroll, performance, ai, users
  models/                User, Employee, Attendance, Payroll, Performance, Counter (employee IDs)
  utils/                 demo seed, password rules, Gemini helper
  scripts/createAdmin.js Bootstrap the first admin
  tests/                 API tests
frontend/src/
  components/ui/         Button, Field, Modal, Card, Badge, Toast, … (shared design system)
  components/layout/     Sidebar + top bar shell
  context/AuthContext    Session, login/logout, /auth/me refresh
  lib/                   API client, role permissions, formatting, fetch hook
  pages/                 Dashboard, employees, attendance, payroll, performance, AI tools, self-service
```

## Running locally

Requirements: Node 20+ and MongoDB (local or Atlas).

```bash
# API
cd backend
cp .env.example .env         # set MONGO_URI and JWT_SECRET
npm install
npm run dev                  # http://localhost:5055

# First admin (skip if you use DEMO_MODE=true)
ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" npm run create-admin

# Frontend (new terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Set `DEMO_MODE=true` to seed a fictional company with one login per role (password `Demo@1234`). **It wipes and reseeds the database on start and every 24 hours**, so only point it at a dedicated demo database.

## Tests

```bash
cd backend && npm test
```

23 API tests cover: no public sign-up, admin-only account creation (and never another admin), generated IDs that aren't reused after deletion, the forced first-login password change, password rules, admin password reset, deleted-account tokens, the role matrix (employees locked out of lists, managers can't see salaries or payroll), payroll net-pay calculation and paying, attendance check-in/out and HR upserts, review validation, the AI "not configured" path, and the demo seed.

## Deployment

- **API on Render**: `render.yaml` is a Blueprint (New → Blueprint). Set `MONGO_URI`, `GOOGLE_AI_API_KEY`, and `CORS_ORIGIN` (your frontend URL if it isn't the default Vercel one).
- **Frontend on Vercel**: root directory `frontend`, set `VITE_API_URL` to `https://<your-api>.onrender.com/api`.

## Known limitations

- JWTs live in `localStorage` for 7 days; there's no refresh-token rotation or server-side revocation (deleting an account does invalidate it).
- No frontend tests yet.
- Lists are fetched whole and filtered in the browser, which is fine for a small company but would need pagination at scale.

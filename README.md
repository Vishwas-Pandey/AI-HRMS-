# AI-HRMS

AI-HRMS is a full-stack HR management app with a React front end and an Express/MongoDB REST API. Admin and HR users manage employee records, attendance, payroll and performance reviews. Employees log in to see their own profile. The HR dashboard also has several tools built on Google's Gemini API: a resume screener, sentiment and insight summaries of performance reviews, an HR chatbot, a document template generator, and analysis of recorded voice interviews. Each of these makes a direct REST call to Gemini from the backend and shows the model's text response.

Live demo: https://hr-management-system-eta-ten.vercel.app/login

## Features

**Auth and roles**
- JWT login (`/api/auth/login`). Passwords are hashed with bcrypt in a Mongoose pre-save hook, and tokens expire after 30 days.
- Four roles on the `User` model: `employee`, `hr`, `manager`, `admin`. `protect` and `restrictTo(...roles)` in `backend/middleware/authMiddleware.js` guard each route.
- The front end keeps the user and token in `localStorage` (`UserContext.jsx`), redirects logged-out users to `/login`, and chooses the dashboard and sidebar links based on `user.role`.

**HR records**
- Employees: create, list with search by name/email, view, edit (admin only), delete (admin only). Creating an employee also creates their login `User`, assigns an ID like `EMP0001`, and adds a first "Pending" payroll record for one month from the joining date. Deleting an employee also deletes their payroll, performance and attendance records and their login.
- Attendance: mark Present/Absent/Leave for an employee on a date. Only one record per employee per day is allowed, enforced by both a query and a unique index.
- Payroll: list records, and admins can add one. Net salary is calculated as gross minus deductions in a pre-save hook.
- Performance: list reviews (rating 1-5 plus comments) and add reviews (see limitations).
- Admin dashboard: total employees, total net payroll, and a count of people present today, all calculated in the browser from the list endpoints.

**Gemini-backed tools** (all in `backend/controllers/aiController.js`, routed under `/api/ai`)
- `GET /insights`: sends all performance reviews to Gemini and returns a short text summary with a "top performer" and an "employee to watch". This endpoint exists only on the backend. The current UI does not call it.
- `GET /sentiment`: asks Gemini for positive/neutral/negative percentages across all review comments, pulls the JSON out of the reply with a regex, and shows it in a Chart.js doughnut chart.
- `GET /dashboard-insights`: asks for four short insight strings as JSON for the HR dashboard.
- `POST /screen-resume`: uploads a resume through multer (in memory, 5 MB limit), sends it as base64 inline data with a job description, and returns a fit score, summary and missing skills as free text.
- `POST /chatbot`: a stateless chat endpoint. The client sends the full message history with each request.
- `POST /generate-template`: turns a prompt into an HR document draft.
- `POST /voice-interview`: the browser records audio with `MediaRecorder` (`VoiceInterviewModal.jsx`) and uploads it. The backend asks Gemini for a transcription, a sentiment label, strengths and red flags.

The AI tools only use performance-review data and whatever the user uploads. They do not train or fine-tune anything, and the response text is shown without further checks.

## Tech stack

- Frontend: React 19, Vite 7, React Router 7, Tailwind CSS 3, Axios, Chart.js with react-chartjs-2
- Backend: Node.js, Express 5, Mongoose 8 (MongoDB), jsonwebtoken, bcryptjs, multer, express-async-handler, dotenv
- AI: Google Gemini REST API (`generativelanguage.googleapis.com`) called with the built-in `fetch`
- Frontend deployed on Vercel (`frontend/vercel.json` rewrites all paths to `index.html` so client-side routing works)

## How it works

- `backend/server.js` loads `.env`, sets up CORS with a hardcoded allowlist of origins, connects to MongoDB, mounts the routers from `backend/routes/*` under `/api/auth`, `/api/users`, `/api/employees`, `/api/attendance`, `/api/payroll`, `/api/performance` and `/api/ai`, and ends with `notFound` / `errorHandler` from `backend/middleware/errorMiddleware.js`.
- Each router calls `protect` and `restrictTo`, then passes the request to a controller in `backend/controllers/`. Controllers use the Mongoose models in `backend/models/` (`User`, `Employee`, `Attendance`, `Payroll`, `Performance`). `Employee` references `User`, and the other three reference `Employee`.
- On the frontend, `src/api/axiosInstance.js` sets the base URL from `VITE_API_URL` and adds `Authorization: Bearer <token>` to every request. `src/App.jsx` defines the routes inside a `ProtectedRoutes` wrapper that renders `DashboardLayout`. `src/pages/DashboardPage.jsx` renders `AdminDashboard`, `HRDashboardContent`, `ManagerDashboard` or `EmployeeDashboard` depending on the role.
- Pages open modals in `src/components/` (`AddPayrollModal`, `AddReviewModal`, `MarkAttendanceModal`, `EditEmployeeModal`, `ChatbotModal`, `TemplateModal`, `VoiceInterviewModal`) to create or edit records.

## Running locally

Requires Node.js 18+ (the backend uses the built-in `fetch`) and a MongoDB connection string.

```bash
# backend
cd backend
npm install
npm run dev      # nodemon server.js  (or: npm start)

# frontend (separate terminal)
cd frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build
npm run lint
```

`backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/hrms
JWT_SECRET=replace-with-a-long-random-string
GOOGLE_AI_API_KEY=your-gemini-api-key
PORT=5000
NODE_ENV=development
```

`frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

To create the first user, `POST /api/auth/register` with `{ name, email, password }`. The first account becomes `admin`; later self-registrations are always `employee`, and admins create HR and manager accounts.

## Known limitations / next steps

- The `manager` role has a placeholder dashboard and no sidebar links, even though the AI routes allow it. "My Tasks" is also a placeholder page.
- There are no automated tests (the backend `test` script is the npm default stub).
- There is no request validation library. Controllers check only that a few fields are present, and `updateEmployee` uses `||`, so fields cannot be cleared.
- Employee IDs come from `countDocuments() + 1`, which can collide with an existing ID after a deletion and then fail the unique index.
- AI: the Gemini API key is sent in the URL query string, safety filters are set to `BLOCK_NONE` on two endpoints, the model names are hardcoded (one of them a dated preview model), and JSON is pulled out of free text with a regex and no schema check. Every review is sent in a single prompt, with no paging or caching.
- The CORS allowlist is hardcoded in `server.js` rather than read from the environment. `backend/config/db.js` is empty (the connection logic lives in `server.js`), and `frontend/src/components/AddEmployeeModal.jsx` is not used.
- JWTs are stored in `localStorage`, and there is no refresh or revocation.

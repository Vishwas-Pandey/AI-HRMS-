// Seeds a small fictional company for the public demo. All names are made up.
const mongoose = require("mongoose");

const DEMO_PASSWORD = "Demo@1234";

const DEMO_ACCOUNTS = [
  { role: "admin", label: "Admin", email: "admin@demo.hrms.dev", first: "Aarav", last: "Mehta", title: "HR Director", dept: "Administration", salary: 180000 },
  { role: "hr", label: "HR", email: "hr@demo.hrms.dev", first: "Priya", last: "Nair", title: "HR Generalist", dept: "Human Resources", salary: 95000 },
  { role: "manager", label: "Manager", email: "manager@demo.hrms.dev", first: "Rohan", last: "Kapoor", title: "Engineering Manager", dept: "Engineering", salary: 150000 },
  { role: "employee", label: "Employee", email: "employee@demo.hrms.dev", first: "Ananya", last: "Iyer", title: "Frontend Developer", dept: "Engineering", salary: 85000 },
];

const OTHER_STAFF = [
  ["Kabir", "Singh", "Backend Developer", "Engineering", 90000],
  ["Meera", "Joshi", "QA Engineer", "Engineering", 70000],
  ["Arjun", "Rao", "Product Designer", "Design", 80000],
  ["Sara", "Khan", "Recruiter", "Human Resources", 60000],
  ["Vikram", "Das", "Sales Executive", "Sales", 65000],
  ["Neha", "Gupta", "Accountant", "Finance", 72000],
  ["Ishaan", "Verma", "DevOps Engineer", "Engineering", 98000],
  ["Tara", "Menon", "Marketing Lead", "Marketing", 88000],
];

const REVIEW_NOTES = {
  5: "Consistently exceeds expectations and mentors teammates.",
  4: "Strong delivery this quarter; communicates blockers early.",
  3: "Meets expectations. Could take more ownership of planning.",
  2: "Missed several deadlines; agreed on a support plan.",
};

// Calendar days relative to today in the company timezone (matches attendance "today").
const utcDay = (offsetDays) => {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.COMPANY_TIMEZONE || "Asia/Kolkata" }).format(new Date());
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
};

const seedDemoData = async ({ reset = false } = {}) => {
  const User = require("../models/User");
  const Employee = require("../models/Employee");
  const Payroll = require("../models/Payroll");
  const Performance = require("../models/Performance");
  const Attendance = require("../models/Attendance");
  const Counter = require("../models/Counter");

  if (reset) {
    await Promise.all(
      [User, Employee, Payroll, Performance, Attendance, Counter].map((m) => m.deleteMany({}))
    );
  } else if (await User.exists({ isDemo: true })) {
    return;
  }

  const people = [
    ...DEMO_ACCOUNTS.map((a) => ({ ...a, isDemo: true, password: DEMO_PASSWORD })),
    ...OTHER_STAFF.map(([first, last, title, dept, salary]) => ({
      role: "employee",
      email: `${first}.${last}@demo.hrms.dev`.toLowerCase(),
      first,
      last,
      title,
      dept,
      salary,
      isDemo: false,
      password: new mongoose.Types.ObjectId().toString(), // unguessable; not meant for login
    })),
  ];

  const employees = [];
  for (const [i, p] of people.entries()) {
    const user = await User.create({
      name: `${p.first} ${p.last}`,
      email: p.email,
      password: p.password,
      role: p.role,
      isDemo: p.isDemo,
      mustChangePassword: false,
    });
    const seq = await Counter.next("employeeId");
    employees.push(
      await Employee.create({
        user: user._id,
        firstName: p.first,
        lastName: p.last,
        email: p.email,
        employeeId: `EMP${String(seq).padStart(4, "0")}`,
        joiningDate: utcDay(400 - i * 25),
        jobTitle: p.title,
        department: p.dept,
        salary: p.salary,
      })
    );
  }

  // Three monthly payslips each; the two older ones are paid.
  const payrolls = [];
  for (const e of employees) {
    for (let m = 2; m >= 0; m--) {
      const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - m, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
      const deductions = Math.round(e.salary * 0.1);
      payrolls.push({
        employee: e._id,
        periodStartDate: start,
        periodEndDate: end,
        grossSalary: e.salary,
        deductions,
        netSalary: e.salary - deductions,
        status: m > 0 ? "Paid" : "Pending",
        paidAt: m > 0 ? end : undefined,
      });
    }
  }
  await Payroll.insertMany(payrolls);

  // Two weeks of attendance on weekdays, with a deterministic sprinkle of leave/absence.
  const attendance = [];
  for (let day = 1; day <= 14; day++) {
    const date = utcDay(day);
    if ([0, 6].includes(date.getUTCDay())) continue;
    employees.forEach((e, i) => {
      const n = (day * 7 + i * 3) % 17;
      const status = n === 0 ? "Absent" : n === 1 ? "Leave" : "Present";
      const checkIn = new Date(date.getTime() + (3.5 + (n % 5) * 0.1) * 3600e3);
      attendance.push({
        employee: e._id,
        date,
        status,
        ...(status === "Present" ? { checkIn, checkOut: new Date(checkIn.getTime() + 9 * 3600e3) } : {}),
      });
    });
  }
  // Today: most people have already checked in, but the demo employee hasn't,
  // so a visitor signing in as them can try check-in.
  const today = utcDay(0);
  employees.forEach((e, i) => {
    if (e.email === DEMO_ACCOUNTS[3].email || i % 5 === 4) return;
    attendance.push({ employee: e._id, date: today, status: "Present", checkIn: new Date(today.getTime() + (3.25 + i * 0.05) * 3600e3) });
  });
  await Attendance.insertMany(attendance);

  const admin = await User.findOne({ email: DEMO_ACCOUNTS[0].email });
  const manager = await User.findOne({ email: DEMO_ACCOUNTS[2].email });
  const reviews = employees.slice(1).map((e, i) => {
    const rating = [5, 4, 4, 3, 5, 2, 4, 3, 4, 5, 3][i % 11];
    return {
      employee: e._id,
      // Engineers are reviewed by their manager; everyone else (and the manager) by the admin.
      reviewer: e.department === "Engineering" && String(e.user) !== String(manager._id) ? manager._id : admin._id,
      rating,
      comments: REVIEW_NOTES[rating] || REVIEW_NOTES[4],
      reviewDate: utcDay(10 + i * 3),
    };
  });
  await Performance.insertMany(reviews);
};

module.exports = { seedDemoData, DEMO_ACCOUNTS, DEMO_PASSWORD };

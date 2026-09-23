const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const { requireOwnProfile } = require("../utils/ownProfile");

const STATUSES = ["Present", "Absent", "Leave"];

// One record per calendar day, stored at UTC midnight of that date. "Today" is
// the date in the company's timezone, so a 1 a.m. IST check-in counts for the
// same day HR sees on their screen.
const COMPANY_TZ = process.env.COMPANY_TIMEZONE || "Asia/Kolkata";

const todayInCompanyTz = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: COMPANY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const dayOf = (value) => {
  const key = value ? String(value).slice(0, 10) : todayInCompanyTz(); // YYYY-MM-DD
  const d = new Date(`${key}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(d.getTime()) ? d : null;
};

const populateEmployee = (q) => q.populate("employee", "firstName lastName jobTitle department employeeId");

// @route GET /api/attendance?date=YYYY-MM-DD  (admin, hr, manager)
exports.getAllAttendance = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.date) {
    const day = dayOf(req.query.date);
    if (!day) {
      res.status(400);
      throw new Error("Invalid date");
    }
    filter.date = day;
  }
  const records = await populateEmployee(Attendance.find(filter).sort({ date: -1, createdAt: -1 }));
  res.json(records.filter((r) => r.employee)); // skip rows whose employee was removed
});

// @route POST /api/attendance  (admin, hr) — mark or update a day for someone
exports.markAttendance = asyncHandler(async (req, res) => {
  const { employee, status } = req.body;
  const date = dayOf(req.body.date);

  if (!employee || !date || !status) {
    res.status(400);
    throw new Error("Employee, date and status are required");
  }
  if (!mongoose.isValidObjectId(employee) || !(await Employee.exists({ _id: employee }))) {
    res.status(400);
    throw new Error("Employee not found");
  }
  if (!STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${STATUSES.join(", ")}`);
  }

  const update = { status };
  if (status === "Present") update.checkIn = req.body.checkIn ? new Date(req.body.checkIn) : new Date();
  else update.$unset = { checkIn: 1, checkOut: 1 };

  const { $unset, ...set } = update;
  const record = await Attendance.findOneAndUpdate(
    { employee, date },
    { $set: set, ...($unset ? { $unset } : {}) },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(201).json(await populateEmployee(Attendance.findById(record._id)));
});

// @route GET /api/attendance/my  (any signed-in user with a profile)
exports.getMyAttendance = asyncHandler(async (req, res) => {
  const me = await requireOwnProfile(req, res);
  res.json(await Attendance.find({ employee: me._id }).sort({ date: -1 }).limit(60));
});

// @route POST /api/attendance/check-in
exports.checkIn = asyncHandler(async (req, res) => {
  const me = await requireOwnProfile(req, res);
  const date = dayOf();
  const existing = await Attendance.findOne({ employee: me._id, date });
  if (existing?.checkIn) {
    res.status(400);
    throw new Error("You have already checked in today");
  }
  const record = await Attendance.findOneAndUpdate(
    { employee: me._id, date },
    { $set: { status: "Present", checkIn: new Date() } },
    { new: true, upsert: true }
  );
  res.status(201).json(record);
});

// @route POST /api/attendance/check-out
exports.checkOut = asyncHandler(async (req, res) => {
  const me = await requireOwnProfile(req, res);
  const record = await Attendance.findOne({ employee: me._id, date: dayOf() });
  if (!record?.checkIn) {
    res.status(400);
    throw new Error("Check in before checking out");
  }
  if (record.checkOut) {
    res.status(400);
    throw new Error("You have already checked out today");
  }
  record.checkOut = new Date();
  await record.save();
  res.json(record);
});

const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Payroll = require("../models/Payroll");
const Performance = require("../models/Performance");
const Attendance = require("../models/Attendance");
const Counter = require("../models/Counter");
const { generateTempPassword, checkPasswordStrength } = require("../utils/password");

// Roles an admin can hand out. Admin accounts are not created from the UI.
const ASSIGNABLE_ROLES = ["hr", "manager", "employee"];

const nextEmployeeId = async () => `EMP${String(await Counter.next("employeeId")).padStart(4, "0")}`;

// Managers see people, not pay.
const shape = (employee, viewer) => {
  const obj = employee.toObject ? employee.toObject() : employee;
  if (viewer.role === "manager") delete obj.salary;
  return obj;
};

const findEmployeeOr404 = async (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid employee id");
  }
  const employee = await Employee.findById(id).populate("user", "role email mustChangePassword");
  if (!employee) {
    res.status(404);
    throw new Error("Employee not found");
  }
  return employee;
};

// @route POST /api/employees  (admin)
// Creates the login account and the employee profile in one step and returns
// the temporary credentials once so the admin can hand them over.
exports.createEmployee = asyncHandler(async (req, res) => {
  const { firstName, lastName, joiningDate, jobTitle, department, salary, phone } = req.body;
  const email = String(req.body.email || "").toLowerCase().trim();
  const role = req.body.role || "employee";
  let password = req.body.password;

  const missing = ["firstName", "lastName", "email", "joiningDate", "jobTitle", "department", "salary"].filter(
    (f) => req.body[f] === undefined || req.body[f] === ""
  );
  if (missing.length) {
    res.status(400);
    throw new Error(`Missing fields: ${missing.join(", ")}`);
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    res.status(400);
    throw new Error(`Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`);
  }
  if (Number(salary) < 0 || Number.isNaN(Number(salary))) {
    res.status(400);
    throw new Error("Salary must be a positive number");
  }
  if (password) {
    const weak = checkPasswordStrength(password);
    if (weak) {
      res.status(400);
      throw new Error(weak);
    }
  } else {
    password = generateTempPassword();
  }

  if ((await User.exists({ email })) || (await Employee.exists({ email }))) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name: `${firstName} ${lastName}`.trim(),
    email,
    password,
    role,
    mustChangePassword: true,
  });

  let employee;
  try {
    employee = await Employee.create({
      user: user._id,
      firstName,
      lastName,
      email,
      phone,
      employeeId: await nextEmployeeId(),
      joiningDate,
      jobTitle,
      department,
      salary: Number(salary),
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id); // don't leave a login without a profile
    throw err;
  }

  const start = new Date(joiningDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  await Payroll.create({
    employee: employee._id,
    periodStartDate: start,
    periodEndDate: end,
    grossSalary: Number(salary),
    deductions: 0,
    status: "Pending",
  });

  const populated = await Employee.findById(employee._id).populate("user", "role email mustChangePassword");
  res.status(201).json({
    employee: populated,
    credentials: { employeeId: employee.employeeId, email, temporaryPassword: password, role },
  });
});

// @route GET /api/employees  (admin, hr, manager)
exports.getAllEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find({}).sort({ employeeId: 1 }).populate("user", "role email mustChangePassword");
  res.json(employees.map((e) => shape(e, req.user)));
});

// @route GET /api/employees/my-profile  (any signed-in user)
exports.getMyEmployeeProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id }).populate("user", "role email");
  if (!employee) {
    res.status(404);
    throw new Error("No employee profile is linked to this account");
  }
  res.json(employee);
});

// @route GET /api/employees/:id  (admin, hr, manager)
exports.getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id, res);
  res.json(shape(employee, req.user));
});

// @route PUT /api/employees/:id  (admin)
exports.updateEmployee = asyncHandler(async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id, res);
  const user = await User.findById(employee.user._id);

  const fields = ["firstName", "lastName", "jobTitle", "department", "joiningDate"];
  for (const f of fields) if (req.body[f] !== undefined && req.body[f] !== "") employee[f] = req.body[f];
  if (req.body.phone !== undefined) employee.phone = String(req.body.phone).trim() || undefined; // "" clears it
  if (req.body.salary !== undefined && req.body.salary !== "") {
    if (Number(req.body.salary) < 0 || Number.isNaN(Number(req.body.salary))) {
      res.status(400);
      throw new Error("Salary must be a positive number");
    }
    employee.salary = Number(req.body.salary);
  }

  if (req.body.email) {
    const email = String(req.body.email).toLowerCase().trim();
    if (email !== employee.email && (await User.exists({ email, _id: { $ne: user._id } }))) {
      res.status(400);
      throw new Error("An account with this email already exists");
    }
    employee.email = email;
    user.email = email;
  }

  if (req.body.role && req.body.role !== user.role) {
    if (!ASSIGNABLE_ROLES.includes(req.body.role)) {
      res.status(400);
      throw new Error(`Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`);
    }
    user.role = req.body.role;
  }

  await employee.save();
  user.name = `${employee.firstName} ${employee.lastName}`.trim();
  await user.save();

  res.json(await Employee.findById(employee._id).populate("user", "role email mustChangePassword"));
});

// @route POST /api/employees/:id/reset-password  (admin)
exports.resetPassword = asyncHandler(async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id, res);
  const user = await User.findById(employee.user._id);
  if (user.isDemo) {
    res.status(403);
    throw new Error("Demo account passwords can't be reset");
  }
  const temporaryPassword = generateTempPassword();
  user.password = temporaryPassword;
  user.mustChangePassword = true;
  await user.save();
  res.json({ credentials: { employeeId: employee.employeeId, email: user.email, temporaryPassword, role: user.role } });
});

// @route DELETE /api/employees/:id  (admin)
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id, res);
  if (String(employee.user._id) === String(req.user._id)) {
    res.status(400);
    throw new Error("You can't delete your own account");
  }
  await Promise.all([
    Payroll.deleteMany({ employee: employee._id }),
    Performance.deleteMany({ employee: employee._id }),
    Attendance.deleteMany({ employee: employee._id }),
    User.findByIdAndDelete(employee.user._id),
  ]);
  await employee.deleteOne();
  res.json({ message: "Employee and all related records removed" });
});

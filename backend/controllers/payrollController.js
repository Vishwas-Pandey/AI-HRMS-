const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const { requireOwnProfile } = require("../utils/ownProfile");

const populateEmployee = (q) => q.populate("employee", "firstName lastName email jobTitle department employeeId");

// @route GET /api/payroll  (admin, hr)
exports.getAllPayrolls = asyncHandler(async (req, res) => {
  const payrolls = await populateEmployee(Payroll.find({}).sort({ periodStartDate: -1 }));
  res.json(payrolls.filter((p) => p.employee));
});

// @route POST /api/payroll  (admin)
exports.createPayroll = asyncHandler(async (req, res) => {
  const { employee, periodStartDate, periodEndDate, grossSalary } = req.body;
  const deductions = Number(req.body.deductions || 0);

  if (!employee || !periodStartDate || !periodEndDate || grossSalary === undefined || grossSalary === "") {
    res.status(400);
    throw new Error("Employee, period and gross salary are required");
  }
  if (!mongoose.isValidObjectId(employee) || !(await Employee.exists({ _id: employee }))) {
    res.status(400);
    throw new Error("Employee not found");
  }
  if (new Date(periodEndDate) <= new Date(periodStartDate)) {
    res.status(400);
    throw new Error("Period end must be after period start");
  }
  if (Number(grossSalary) < 0 || deductions < 0 || deductions > Number(grossSalary)) {
    res.status(400);
    throw new Error("Deductions must be between 0 and the gross salary");
  }

  const payroll = await Payroll.create({
    employee,
    periodStartDate,
    periodEndDate,
    grossSalary: Number(grossSalary),
    deductions,
  });
  res.status(201).json(await populateEmployee(Payroll.findById(payroll._id)));
});

// @route PATCH /api/payroll/:id/pay  (admin)
exports.markPaid = asyncHandler(async (req, res) => {
  const payroll = mongoose.isValidObjectId(req.params.id) && (await Payroll.findById(req.params.id));
  if (!payroll) {
    res.status(404);
    throw new Error("Payroll record not found");
  }
  if (payroll.status === "Paid") {
    res.status(400);
    throw new Error("This payroll record is already paid");
  }
  payroll.status = "Paid";
  payroll.paidAt = new Date();
  await payroll.save();
  res.json(await populateEmployee(Payroll.findById(payroll._id)));
});

// @route GET /api/payroll/my-payslips  (any signed-in user with a profile)
exports.getMyPayrollRecords = asyncHandler(async (req, res) => {
  const me = await requireOwnProfile(req, res);
  res.json(await Payroll.find({ employee: me._id }).sort({ periodStartDate: -1 }));
});

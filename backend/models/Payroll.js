const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Employee", // This must match the name of your Employee model
    },
    periodStartDate: {
      type: Date,
      required: true,
    },
    periodEndDate: {
      type: Date,
      required: true,
    },
    grossSalary: {
      type: Number,
      required: true,
    },
    deductions: {
      // e.g., taxes, insurance
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
    },
    paidAt: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

// netSalary is required, so it must be computed before validation runs.
payrollSchema.pre("validate", function () {
  this.netSalary = (this.grossSalary || 0) - (this.deductions || 0);
});

const Payroll = mongoose.model("Payroll", payrollSchema);

module.exports = Payroll;

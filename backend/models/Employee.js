const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // This links to the User model (for login)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    // New fields from your design
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    jobTitle: {
      // This is "Position" on your form
      type: String,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;

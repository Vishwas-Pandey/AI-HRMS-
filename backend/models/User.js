const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["employee", "hr", "manager", "admin"];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Please add a name"], trim: true },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please add a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 8,
      select: false,
    },
    role: { type: String, enum: ROLES, default: "employee" },
    // Set when an admin issues credentials; cleared once the user picks their own password.
    mustChangePassword: { type: Boolean, default: false },
    // Seeded public demo accounts: their passwords can't be changed.
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
module.exports.ROLES = ROLES;

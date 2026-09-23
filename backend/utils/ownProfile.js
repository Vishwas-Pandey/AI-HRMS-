const Employee = require("../models/Employee");

// The employee profile linked to the signed-in account, or a 404.
const requireOwnProfile = async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });
  if (!employee) {
    res.status(404);
    throw new Error("No employee profile is linked to this account");
  }
  return employee;
};

module.exports = { requireOwnProfile };

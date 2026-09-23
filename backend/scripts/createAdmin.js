// Bootstrap the first admin account:
//   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" npm run create-admin
// Set ADMIN_PASSWORD to choose the password; otherwise a temporary one is printed
// and must be changed at first login.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { generateTempPassword, checkPasswordStrength } = require("../utils/password");

(async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const name = process.env.ADMIN_NAME || "Administrator";
  if (!email) throw new Error("Set ADMIN_EMAIL");

  let password = process.env.ADMIN_PASSWORD;
  const generated = !password;
  if (generated) password = generateTempPassword();
  const weak = checkPasswordStrength(password);
  if (weak) throw new Error(weak);

  await mongoose.connect(process.env.MONGO_URI);
  if (await User.exists({ email })) throw new Error(`${email} already exists`);
  await User.create({ name, email, password, role: "admin", mustChangePassword: generated });

  console.log(`Admin created: ${email}`);
  if (generated) console.log(`Temporary password: ${password} (you'll be asked to change it)`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});

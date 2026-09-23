const crypto = require("crypto");

// Readable temporary password: no 0/O or 1/l/I, always has upper, lower and digit.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

const generateTempPassword = (length = 10) => {
  let out = "";
  do {
    out = Array.from(crypto.randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join("");
  } while (!/[A-Z]/.test(out) || !/[a-z]/.test(out) || !/\d/.test(out));
  return out;
};

// Returns an error message, or null when the password is acceptable.
const checkPasswordStrength = (password) => {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain letters and numbers";
  return null;
};

module.exports = { generateTempPassword, checkPasswordStrength };

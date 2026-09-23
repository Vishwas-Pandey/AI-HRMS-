const { before, after, beforeEach } = require("node:test");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";
delete process.env.GOOGLE_AI_API_KEY;

const app = require("../app");
const User = require("../models/User");

let mongo;

const setupDb = () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });
  beforeEach(async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });
  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
};

const api = () => request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const login = async (email, password) => {
  const res = await api().post("/api/auth/login").send({ email, password });
  return res.body.token;
};

// An admin who has already set their own password.
const createAdmin = async () => {
  await User.create({ name: "Admin", email: "admin@test.dev", password: "AdminPass1", role: "admin" });
  return login("admin@test.dev", "AdminPass1");
};

const EMPLOYEE_BODY = {
  firstName: "Test",
  lastName: "Person",
  joiningDate: "2026-01-05",
  jobTitle: "Developer",
  department: "Engineering",
  salary: 50000,
};

// Admin creates an account, the new user logs in with the temp password and sets their own.
const onboard = async (adminToken, { role = "employee", email } = {}) => {
  const res = await api()
    .post("/api/employees")
    .set(bearer(adminToken))
    .send({ ...EMPLOYEE_BODY, email: email || `${role}${Math.random().toString(16).slice(2, 8)}@test.dev`, role });
  const { credentials, employee } = res.body;
  const tempToken = await login(credentials.email, credentials.temporaryPassword);
  await api()
    .post("/api/auth/change-password")
    .set(bearer(tempToken))
    .send({ currentPassword: credentials.temporaryPassword, newPassword: "NewPass123" });
  return { token: await login(credentials.email, "NewPass123"), employee, credentials };
};

module.exports = { setupDb, api, bearer, login, createAdmin, onboard, EMPLOYEE_BODY };

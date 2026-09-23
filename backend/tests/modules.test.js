const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { setupDb, api, bearer, createAdmin, onboard } = require("./helpers");
const { seedDemoData, DEMO_ACCOUNTS, DEMO_PASSWORD } = require("../utils/demoSeed");

setupDb();

describe("payroll", () => {
  it("creating an employee creates a first pending payslip", async () => {
    const admin = await createAdmin();
    const emp = await onboard(admin);
    const mine = await api().get("/api/payroll/my-payslips").set(bearer(emp.token));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.length, 1);
    assert.equal(mine.body[0].status, "Pending");
  });

  it("admin creates a payroll record (net salary computed) and marks it paid", async () => {
    const admin = await createAdmin();
    const emp = await onboard(admin);
    const res = await api().post("/api/payroll").set(bearer(admin)).send({
      employee: emp.employee._id,
      periodStartDate: "2026-08-01",
      periodEndDate: "2026-08-31",
      grossSalary: 60000,
      deductions: 5000,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.netSalary, 55000);

    const paid = await api().patch(`/api/payroll/${res.body._id}/pay`).set(bearer(admin));
    assert.equal(paid.status, 200);
    assert.equal(paid.body.status, "Paid");
    const again = await api().patch(`/api/payroll/${res.body._id}/pay`).set(bearer(admin));
    assert.equal(again.status, 400);
  });

  it("rejects deductions larger than the gross salary", async () => {
    const admin = await createAdmin();
    const emp = await onboard(admin);
    const res = await api().post("/api/payroll").set(bearer(admin)).send({
      employee: emp.employee._id,
      periodStartDate: "2026-08-01",
      periodEndDate: "2026-08-31",
      grossSalary: 1000,
      deductions: 5000,
    });
    assert.equal(res.status, 400);
  });
});

describe("attendance", () => {
  it("employee checks in and out once per day", async () => {
    const admin = await createAdmin();
    const emp = await onboard(admin);
    assert.equal((await api().post("/api/attendance/check-out").set(bearer(emp.token))).status, 400);
    assert.equal((await api().post("/api/attendance/check-in").set(bearer(emp.token))).status, 201);
    assert.equal((await api().post("/api/attendance/check-in").set(bearer(emp.token))).status, 400);
    assert.equal((await api().post("/api/attendance/check-out").set(bearer(emp.token))).status, 200);
    const mine = await api().get("/api/attendance/my").set(bearer(emp.token));
    assert.equal(mine.body.length, 1);
    assert.ok(mine.body[0].checkOut);
  });

  it("HR marks attendance; marking the same day again updates it", async () => {
    const admin = await createAdmin();
    const hr = await onboard(admin, { role: "hr" });
    const emp = await onboard(admin);
    const mark = (status) =>
      api().post("/api/attendance").set(bearer(hr.token)).send({ employee: emp.employee._id, date: "2026-09-01", status });
    assert.equal((await mark("Present")).status, 201);
    assert.equal((await mark("Leave")).status, 201);
    const list = await api().get("/api/attendance?date=2026-09-01").set(bearer(hr.token));
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].status, "Leave");
  });
});

describe("performance", () => {
  it("manager reviews an employee; employee sees it with the reviewer's name", async () => {
    const admin = await createAdmin();
    const manager = await onboard(admin, { role: "manager" });
    const emp = await onboard(admin);
    const res = await api()
      .post("/api/performance")
      .set(bearer(manager.token))
      .send({ employee: emp.employee._id, rating: 4, comments: "Solid quarter" });
    assert.equal(res.status, 201);
    const mine = await api().get("/api/performance/my-reviews").set(bearer(emp.token));
    assert.equal(mine.body.length, 1);
    assert.equal(mine.body[0].reviewer.role, "manager");
  });

  it("rejects out-of-range ratings and self-reviews", async () => {
    const admin = await createAdmin();
    const manager = await onboard(admin, { role: "manager" });
    const emp = await onboard(admin);
    const bad = await api().post("/api/performance").set(bearer(manager.token)).send({ employee: emp.employee._id, rating: 7, comments: "x" });
    assert.equal(bad.status, 400);
    const self = await api().post("/api/performance").set(bearer(manager.token)).send({ employee: manager.employee._id, rating: 5, comments: "me" });
    assert.equal(self.status, 400);
  });
});

describe("ai and demo", () => {
  it("AI endpoints return a clear 503 when no API key is configured", async () => {
    const admin = await createAdmin();
    const res = await api().post("/api/ai/chatbot").set(bearer(admin)).send({ message: "hi", history: [] });
    assert.equal(res.status, 503);
    assert.match(res.body.message, /not configured/);
  });

  it("demo seed creates one working login per role, and demo passwords can't be changed", async () => {
    await seedDemoData({ reset: true });
    for (const account of DEMO_ACCOUNTS) {
      const res = await api().post("/api/auth/login").send({ email: account.email, password: DEMO_PASSWORD });
      assert.equal(res.status, 200, account.role);
      assert.equal(res.body.role, account.role);
      assert.equal(res.body.mustChangePassword, false);
    }
    const token = (await api().post("/api/auth/login").send({ email: DEMO_ACCOUNTS[3].email, password: DEMO_PASSWORD })).body.token;
    const change = await api().post("/api/auth/change-password").set(bearer(token)).send({ currentPassword: DEMO_PASSWORD, newPassword: "Hacked123" });
    assert.equal(change.status, 403);
    const payslips = await api().get("/api/payroll/my-payslips").set(bearer(token));
    assert.equal(payslips.body.length, 3);
  });
});

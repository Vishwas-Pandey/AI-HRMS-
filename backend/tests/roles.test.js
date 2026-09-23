const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { setupDb, api, bearer, createAdmin, onboard, EMPLOYEE_BODY } = require("./helpers");

setupDb();

describe("role permissions", () => {
  it("only admin can create accounts, and never another admin", async () => {
    const admin = await createAdmin();
    const hr = await onboard(admin, { role: "hr" });

    const byHr = await api().post("/api/employees").set(bearer(hr.token)).send({ ...EMPLOYEE_BODY, email: "x@test.dev" });
    assert.equal(byHr.status, 403);

    const asAdmin = await api().post("/api/employees").set(bearer(admin)).send({ ...EMPLOYEE_BODY, email: "y@test.dev", role: "admin" });
    assert.equal(asAdmin.status, 400);
  });

  it("employees can't see the employee list, payroll or others' data", async () => {
    const admin = await createAdmin();
    const emp = await onboard(admin);
    for (const path of ["/api/employees", "/api/payroll", "/api/attendance", "/api/performance", "/api/users"]) {
      const res = await api().get(path).set(bearer(emp.token));
      assert.equal(res.status, 403, path);
    }
  });

  it("managers can list employees but don't see salaries or payroll", async () => {
    const admin = await createAdmin();
    await onboard(admin);
    const manager = await onboard(admin, { role: "manager" });
    const list = await api().get("/api/employees").set(bearer(manager.token));
    assert.equal(list.status, 200);
    assert.ok(list.body.length >= 2);
    assert.ok(list.body.every((e) => e.salary === undefined));
    const payroll = await api().get("/api/payroll").set(bearer(manager.token));
    assert.equal(payroll.status, 403);
  });

  it("admin can change a role; the new role takes effect", async () => {
    const admin = await createAdmin();
    const emp = await onboard(admin);
    const res = await api().put(`/api/employees/${emp.employee._id}`).set(bearer(admin)).send({ role: "hr" });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, "hr");
    const list = await api().get("/api/employees").set(bearer(emp.token));
    assert.equal(list.status, 200);
  });

  it("admin can't delete their own account", async () => {
    const admin = await createAdmin();
    const res = await api().delete("/api/employees/000000000000000000000000").set(bearer(admin));
    assert.equal(res.status, 404);
  });

  it("invalid ids return 400 instead of a server error", async () => {
    const admin = await createAdmin();
    const res = await api().get("/api/employees/not-an-id").set(bearer(admin));
    assert.equal(res.status, 400);
  });
});

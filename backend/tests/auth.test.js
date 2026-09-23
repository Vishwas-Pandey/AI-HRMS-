const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { setupDb, api, bearer, login, createAdmin, EMPLOYEE_BODY } = require("./helpers");

setupDb();

describe("auth and admin-issued credentials", () => {
  it("has no public sign-up endpoint", async () => {
    const res = await api().post("/api/auth/register").send({ name: "x", email: "x@x.dev", password: "Password1" });
    assert.equal(res.status, 404);
  });

  it("rejects bad credentials", async () => {
    await createAdmin();
    const res = await api().post("/api/auth/login").send({ email: "admin@test.dev", password: "wrong" });
    assert.equal(res.status, 401);
  });

  it("admin creates an employee and gets a generated ID and temporary password", async () => {
    const admin = await createAdmin();
    const res = await api()
      .post("/api/employees")
      .set(bearer(admin))
      .send({ ...EMPLOYEE_BODY, email: "New.Hire@Test.dev", role: "hr" });
    assert.equal(res.status, 201);
    assert.match(res.body.credentials.employeeId, /^EMP\d{4}$/);
    assert.equal(res.body.credentials.email, "new.hire@test.dev");
    assert.equal(res.body.credentials.role, "hr");
    assert.ok(res.body.credentials.temporaryPassword.length >= 8);
  });

  it("employee IDs are never reused after a deletion", async () => {
    const admin = await createAdmin();
    const create = (email) => api().post("/api/employees").set(bearer(admin)).send({ ...EMPLOYEE_BODY, email });
    const a = await create("a@test.dev");
    await create("b@test.dev");
    await api().delete(`/api/employees/${a.body.employee._id}`).set(bearer(admin));
    const c = await create("c@test.dev");
    assert.equal(c.status, 201);
    assert.equal(c.body.credentials.employeeId, "EMP0003");
  });

  it("forces a password change before anything else", async () => {
    const admin = await createAdmin();
    const { body } = await api().post("/api/employees").set(bearer(admin)).send({ ...EMPLOYEE_BODY, email: "e@test.dev" });
    const loginRes = await api().post("/api/auth/login").send({ email: "e@test.dev", password: body.credentials.temporaryPassword });
    assert.equal(loginRes.body.mustChangePassword, true);
    const token = loginRes.body.token;

    const blocked = await api().get("/api/employees/my-profile").set(bearer(token));
    assert.equal(blocked.status, 403);

    const me = await api().get("/api/auth/me").set(bearer(token));
    assert.equal(me.status, 200);
    assert.equal(me.body.employeeId, "EMP0001");

    const weak = await api()
      .post("/api/auth/change-password")
      .set(bearer(token))
      .send({ currentPassword: body.credentials.temporaryPassword, newPassword: "short" });
    assert.equal(weak.status, 400);

    const ok = await api()
      .post("/api/auth/change-password")
      .set(bearer(token))
      .send({ currentPassword: body.credentials.temporaryPassword, newPassword: "MyOwnPass9" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.mustChangePassword, false);

    assert.equal(await login("e@test.dev", body.credentials.temporaryPassword), undefined);
    const newToken = await login("e@test.dev", "MyOwnPass9");
    const profile = await api().get("/api/employees/my-profile").set(bearer(newToken));
    assert.equal(profile.status, 200);
  });

  it("change-password requires the current password", async () => {
    const admin = await createAdmin();
    const res = await api()
      .post("/api/auth/change-password")
      .set(bearer(admin))
      .send({ currentPassword: "nope", newPassword: "Another123" });
    assert.equal(res.status, 400);
  });

  it("admin can reset a password, which forces another change", async () => {
    const admin = await createAdmin();
    const { body } = await api().post("/api/employees").set(bearer(admin)).send({ ...EMPLOYEE_BODY, email: "r@test.dev" });
    const reset = await api().post(`/api/employees/${body.employee._id}/reset-password`).set(bearer(admin));
    assert.equal(reset.status, 200);
    const res = await api().post("/api/auth/login").send({ email: "r@test.dev", password: reset.body.credentials.temporaryPassword });
    assert.equal(res.body.mustChangePassword, true);
  });

  it("a token for a deleted account is rejected with 401, not a crash", async () => {
    const admin = await createAdmin();
    const { body } = await api().post("/api/employees").set(bearer(admin)).send({ ...EMPLOYEE_BODY, email: "gone@test.dev" });
    const token = await login("gone@test.dev", body.credentials.temporaryPassword);
    await api().delete(`/api/employees/${body.employee._id}`).set(bearer(admin));
    const res = await api().get("/api/auth/me").set(bearer(token));
    assert.equal(res.status, 401);
  });
});

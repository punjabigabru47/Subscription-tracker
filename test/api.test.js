import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.PGDATABASE ??= "subscription_tracker";
process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_EXPIRATION ??= "1h";
process.env.SERVER_URL ??= "http://localhost:5500";

const { default: app, initializeApp } = await import("../app.js");
const { default: pool } = await import("../database/database.js");
const { runMigrations } = await import("../database/migrations.js");

const createdEmails = [];

const createTestUser = async () => {
  const email = `test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = "password123";

  const response = await request(app)
    .post("/api/v1/auth/sign-up")
    .send({
      name: "Test User",
      email,
      password,
    })
    .expect(201);

  createdEmails.push(email);

  return {
    email,
    password,
    token: response.body.data.token,
    user: response.body.data.user,
  };
};

before(async () => {
  await initializeApp();
  await runMigrations();
});

after(async () => {
  for (const email of createdEmails) {
    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  }

  await pool.end();
});

test("signs up a user and returns a token", async () => {
  const { email } = await createTestUser();

  const { rows } = await pool.query(
    "SELECT id, email, password FROM users WHERE email = $1",
    [email],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, email);
  assert.notEqual(rows[0].password, "password123");
});

test("signs in with valid credentials", async () => {
  const { email, password } = await createTestUser();

  const response = await request(app)
    .post("/api/v1/auth/sign-in")
    .send({ email, password })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "User signed in successfully");
  assert.ok(response.body.data.token);
  assert.equal(response.body.data.user.email, email);
  assert.equal(response.body.data.user.password, undefined);
});

test("rejects protected routes without a token", async () => {
  const response = await request(app).get("/api/v1/users").expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Unauthorized");
});

test("allows protected routes with a valid token", async () => {
  const { token } = await createTestUser();

  const response = await request(app)
    .get("/api/v1/users")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.ok(Array.isArray(response.body.data));
});

test("creates a subscription for an authenticated user", async () => {
  const { token, user } = await createTestUser();

  const response = await request(app)
    .post("/api/v1/subscriptions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Netflix Premium",
      price: 15.99,
      currency: "USD",
      frequency: "monthly",
      category: "entertainment",
      paymentMethod: "Credit Card",
      startDate: "2026-05-16",
      renewalDate: "2026-06-16",
    })
    .expect(201);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.name, "Netflix Premium");
  assert.equal(response.body.data.user_id, user.id);
  assert.equal(response.body.data.workflowRunId, "test-workflow-run");
});

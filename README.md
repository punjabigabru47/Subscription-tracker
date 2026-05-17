# Subscription Tracker API

A production-minded Express and PostgreSQL API for tracking paid subscriptions, managing user authentication, and sending renewal reminders through Upstash Workflow and email.

The app supports JWT authentication, protected subscription routes, request validation with Zod, PostgreSQL migrations, Arcjet security protection, CI tests, and a health check endpoint for deployment platforms.

## Features

- User signup, signin, and signout.
- JWT-protected routes.
- Subscription CRUD with ownership checks.
- Automatic renewal date and status handling.
- Upstash Workflow integration for renewal reminders.
- Nodemailer email reminder utility.
- PostgreSQL database with SQL migrations.
- Zod request validation.
- Arcjet bot/rate-limit protection.
- Helmet security headers and CORS support.
- Integration tests with Node's built-in test runner.
- GitHub Actions CI pipeline.

## Tech Stack

- Node.js
- Express 5
- PostgreSQL
- `pg`
- JWT / `jsonwebtoken`
- `bcrypt`
- Zod
- Upstash Workflow / QStash
- Nodemailer
- Arcjet
- Helmet
- CORS
- Supertest
- GitHub Actions

## Project Structure

```text
.
├── app.js
├── config/
├── controllers/
├── database/
├── middlewares/
├── migrations/
├── models/
├── routes/
├── scripts/
├── test/
└── utils/
```

## Requirements

- Node.js 22 or newer recommended.
- PostgreSQL running locally or hosted.
- Upstash QStash credentials for workflow reminders.
- Gmail App Password or another email provider credential if using email reminders.

## Environment Variables

Create a local env file:

```bash
.env.development.local
```

Example:

```env
PORT=5500
NODE_ENV=development
SERVER_URL=http://localhost:5500
CORS_ORIGIN=http://localhost:3000

PGHOST=localhost
PGPORT=5432
PGDATABASE=subscription_tracker
PGUSER=postgres
PGPASSWORD=postgres

JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRATION=15m

ARCJET_API_KEY=your_arcjet_key
ARCJET_ENV=development

QSTASH_URL=http://127.0.0.1:8080
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key

EMAIL_USER=your_sender_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

For production, set these on your hosting platform instead of relying on local files:

```env
DATABASE_URL=
PGSSL=true
SERVER_URL=https://your-api-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=
JWT_EXPIRATION=15m
ARCJET_API_KEY=
ARCJET_ENV=production
QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
EMAIL_USER=
EMAIL_PASSWORD=
```

Notes:

- `DATABASE_URL` is recommended in production.
- SSL is enabled automatically for `DATABASE_URL` outside development/test unless `PGSSL=false`.
- `SERVER_URL` must be your public deployed API URL in production.
- `JWT_EXPIRATION` should stay short, such as `15m`, because refresh tokens handle persistent login.
- Gmail requires an App Password, not your normal Gmail password.
- Never commit real `.env.*.local` files or secrets.

## Setup

Install dependencies:

```bash
npm install
```

Run PostgreSQL and create the database:

```bash
createdb subscription_tracker
```

Run migrations:

```bash
npm run migrate
```

Start the development server:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5500
```

## Migrations

Migration files live in:

```text
migrations/
```

Run all pending migrations:

```bash
npm run migrate
```

The migration runner records applied files in the `schema_migrations` table so each migration runs only once.

Current migrations:

- `001_create_users.sql`
- `002_create_subscriptions.sql`
- `003_add_auth_security.sql`

In production, run migrations before starting the app:

```bash
npm run migrate
npm start
```

## Running Tests

Run the test suite:

```bash
npm test
```

The tests cover:

- Signup
- Signin
- Refresh token rotation
- Signout token invalidation
- Password reset session invalidation
- Protected routes without a token
- Protected routes with a valid token
- Subscription creation
- Subscription get/update/cancel/delete
- Ownership protection

## Health Check

Deployment platforms can use:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

## API Endpoints

Base URL:

```text
http://localhost:5500/api/v1
```

### Auth

#### Sign Up

```http
POST /auth/sign-up
```

Body:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

#### Sign In

```http
POST /auth/sign-in
```

Body:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

#### Sign Out

```http
POST /auth/sign-out
```

Headers:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Body:

```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

This blacklists the current access token and revokes the refresh token.

#### Refresh Token

```http
POST /auth/refresh-token
```

Body:

```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

#### Request Password Reset

```http
POST /auth/request-password-reset
```

Body:

```json
{
  "email": "test@example.com"
}
```

#### Reset Password

```http
POST /auth/reset-password
```

Body:

```json
{
  "token": "RESET_TOKEN_FROM_EMAIL",
  "password": "newpassword123"
}
```

### Authenticated Requests

Protected endpoints require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Users

#### Get All Users

```http
GET /users
```

Protected.

#### Get User By ID

```http
GET /users/:id
```

Protected.

### Subscriptions

#### Get My Subscriptions

```http
GET /subscriptions
```

Protected.

#### Create Subscription

```http
POST /subscriptions
```

Protected.

Body:

```json
{
  "name": "Netflix Premium",
  "price": 15.99,
  "currency": "USD",
  "frequency": "monthly",
  "category": "entertainment",
  "paymentMethod": "Credit Card",
  "startDate": "2026-05-16",
  "renewalDate": "2026-06-16"
}
```

`renewalDate` is optional. If omitted, the API calculates it from `startDate` and `frequency`.

#### Get Subscription By ID

```http
GET /subscriptions/:id
```

Protected. Users can only access their own subscriptions.

#### Update Subscription

```http
PUT /subscriptions/:id
```

Protected.

Example body:

```json
{
  "name": "Netflix Standard",
  "price": 12.99
}
```

#### Cancel Subscription

```http
PUT /subscriptions/:id/cancel
```

Protected. Sets `status` to `cancelled`.

#### Delete Subscription

```http
DELETE /subscriptions/:id
```

Protected.

#### Get User Subscriptions

```http
GET /subscriptions/user/:id
```

Protected. The requested user id must match the authenticated user.

### Workflow

The workflow endpoint is called by Upstash/QStash:

```http
POST /workflow/subscription/reminder
```

You usually do not call this endpoint manually.

## Local Upstash QStash

For local workflow testing, run QStash in a separate terminal:

```bash
npx @upstash/qstash-cli dev
```

Copy the printed `QSTASH_URL`, `QSTASH_TOKEN`, and signing keys into `.env.development.local`.

## Deployment Notes

Before deploying:

- Set all required environment variables on your hosting platform.
- Use a hosted PostgreSQL database.
- Set `DATABASE_URL`.
- Set `SERVER_URL` to the public API URL.
- Set `CORS_ORIGIN` to the frontend URL.
- Set real Upstash QStash credentials.
- Set a strong `JWT_SECRET`.
- Run migrations before starting the app.

Typical production commands:

```bash
npm ci
npm run migrate
npm start
```

If your host separates build/start commands:

- Build command: `npm ci && npm run migrate`
- Start command: `npm start`

## CI

GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

The CI pipeline:

- Starts a PostgreSQL service.
- Installs dependencies with `npm ci`.
- Runs `npm test`.

## Security Notes

- Passwords are hashed with bcrypt.
- JWT-protected routes use the `Authorization: Bearer <token>` header.
- Helmet adds security headers.
- CORS supports a configured `CORS_ORIGIN`.
- Arcjet provides bot/rate-limit protection.
- SQL queries use parameterized values.
- Do not commit secrets.

## Current Limitations

- Email sending uses Gmail/Nodemailer; a production email service like Resend, Postmark, SendGrid, or AWS SES is recommended.
- Migration runner is intentionally simple and does not currently support rollback migrations.
- JWT signout is client-side only; issued tokens remain valid until expiry.
- API documentation is in this README; an OpenAPI/Swagger spec could be added later.

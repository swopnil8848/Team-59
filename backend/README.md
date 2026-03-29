# Backend Setup Guide

This backend is a NestJS API that uses PostgreSQL and Prisma.

## 1. Prerequisites

Install these tools before starting:

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

You can verify the installs with:

```powershell
node -v
npm -v
psql --version
```

If `psql` is not recognized, PostgreSQL may still be installed, but its `bin` folder is not on your `PATH`.

## 2. Open the backend folder

From the project root:

```powershell
cd backend
```

All remaining commands in this guide should be run inside the `backend` folder.

## 3. Install dependencies

```powershell
npm install
```

This installs NestJS, Prisma, and the rest of the backend dependencies.

## 4. Create the environment file

Copy `.env.example` into a real `.env` file:

```powershell
Copy-Item .env.example .env
```

After that, open [`.env`](d:/Team-59/backend/.env) and update the values.

Example:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/us_nep_hackathon
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=7d
FRONTEND_ORIGIN=http://localhost:5173
AI_BACKEND_URL=http://13.220.64.204
REDIS_HOST=127.0.0.1
REDIS_PORT=6378
REDIS_PASSWORD=
REDIS_PREFETCH_LOCK_TTL_SECONDS=120
REDIS_PREFETCH_BACKFILL_INTERVAL_MS=60000
```

## 5. Understand each `.env` value

`NODE_ENV`

- Use `development` for local work.

`PORT`

- This is the backend server port.
- Default in this project is `3001`.

`API_PREFIX`

- This project prefixes all routes with `api`.
- Example: `http://localhost:3001/api/auth/login`

`DATABASE_URL`

- This is the PostgreSQL connection string.
- Format:

```text
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

- For local PostgreSQL, this usually looks like:

```text
postgresql://postgres:your_password_here@localhost:5432/us_nep_hackathon
```

`JWT_SECRET`

- This is used to sign login tokens.
- Use a long, random string.
- Example:

```text
my-super-long-local-development-secret-key-12345
```

`JWT_EXPIRES_IN`

- Token lifetime.
- `7d` is already a good default for local development.

`FRONTEND_ORIGIN`

- The frontend URL that is allowed to call this backend through CORS.
- For local frontend development, keep:

```text
http://localhost:5173
```

`AI_BACKEND_URL`

- This is the third-party question-generation service used for game sessions.
- Keep the current backend integration URL unless you are intentionally changing that service.

`REDIS_HOST`

- Redis host for question prefetch caching.
- For local development, keep:

```text
127.0.0.1
```

`REDIS_PORT`

- Redis port for question prefetch caching.
- Local default for this project is:

```text
6378
```

`REDIS_PASSWORD`

- Leave this blank for local Redis if authentication is disabled.
- If your Redis instance requires auth, put the password here.

`REDIS_PREFETCH_LOCK_TTL_SECONDS`

- Short lock TTL used to prevent duplicate concurrent prefetch jobs.
- `120` is a good local default.

`REDIS_PREFETCH_BACKFILL_INTERVAL_MS`

- Interval for the safety-net backfill loop.
- `60000` means the backfill runs every 1 minute.

## 6. Create the PostgreSQL database

You need a PostgreSQL server running locally before the backend can start.

### Option A: Using `psql`

Open PowerShell and start the PostgreSQL shell:

```powershell
psql -U postgres
```

If PostgreSQL asks for a password, enter the password you created when installing PostgreSQL.

If you do not remember your PostgreSQL password, you need to reset it in PostgreSQL before continuing.

After entering `psql`, create the database:

```sql
CREATE DATABASE us_nep_hackathon;
```

You can verify it exists:

```sql
\l
```

Then exit:

```sql
\q
```

### Option B: Using pgAdmin

If you installed pgAdmin with PostgreSQL:

1. Open pgAdmin.
2. Connect to your local PostgreSQL server.
3. Expand `Servers`.
4. Expand your local PostgreSQL instance.
5. Right-click `Databases`.
6. Click `Create`.
7. Click `Database...`
8. Set the database name to `us_nep_hackathon`.
9. Save it.

## 7. Put the correct PostgreSQL password in `DATABASE_URL`

This is the step that usually causes the most setup issues.

If your PostgreSQL username is `postgres` and your password is `postgres`, then:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/us_nep_hackathon
```

If your PostgreSQL username is `postgres` and your password is something else, replace only the password part:

```env
DATABASE_URL=postgresql://postgres:YOUR_REAL_PASSWORD@localhost:5432/us_nep_hackathon
```

Important notes:

- Do not wrap the URL in quotes.
- If your password contains special characters like `@`, `:`, `/`, or `#`, it may need URL encoding.
- Example: `@` becomes `%40`

Example:

If your real password is:

```text
Maharj@n123
```

Then your `DATABASE_URL` should be:

```env
DATABASE_URL=postgresql://postgres:Maharj%40n123@localhost:5432/us_nep_hackathon
```

## 8. Generate the Prisma client

Run:

```powershell
npm run prisma:generate
```

This generates the Prisma client based on [schema.prisma](d:/Team-59/backend/prisma/schema.prisma).

## 9. Run the database migration

This project already contains a migration, so apply it to your local database:

```powershell
npm run prisma:migrate -- --name init
```

If Prisma says the migration already exists and applies the existing migration, that is fine.

This creates the project tables in PostgreSQL:

- `User`
- `OnboardingQuestion`
- `OnboardingResponse`
- `OnboardingAnswer`

## 10. Seed the onboarding questions

Run:

```powershell
npm run seed
```

This reads [onboarding-questions.json](d:/Team-59/backend/src/onboarding/data/onboarding-questions.json) and inserts or updates onboarding questions in the database.

## 11. Start the backend server

For development:

```powershell
npm run start:dev
```

For a one-time start:

```powershell
npm run start
```

The backend should be available at:

```text
http://localhost:3001
```

Because this app uses the `api` prefix, the real route base is:

```text
http://localhost:3001/api
```

## 12. Test that the backend is working

Open these routes in Postman, Insomnia, or another API client.

Public routes:

- `POST http://localhost:3001/api/auth/register`
- `POST http://localhost:3001/api/auth/login`
- `GET http://localhost:3001/api/onboarding/questions`

Protected routes:

- `GET http://localhost:3001/api/users/me`
- `GET http://localhost:3001/api/onboarding/responses/me`
- `POST http://localhost:3001/api/onboarding/responses`
- `PATCH http://localhost:3001/api/onboarding/responses/me`

Protected routes require a Bearer token from login/register.

## 13. Example auth request

Example register request:

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

If successful, the response includes a JWT access token.

Use that token in protected requests:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 14. Common setup problems

### Error: `password authentication failed for user "postgres"`

Cause:

- The password in `DATABASE_URL` does not match your PostgreSQL password.

Fix:

- Update `DATABASE_URL` with the correct password.
- URL-encode special characters if needed.

### Error: `database "us_nep_hackathon" does not exist`

Cause:

- The database was not created yet.

Fix:

- Create it in `psql` or pgAdmin first.

### Error: `P1001: Can't reach database server`

Cause:

- PostgreSQL is not running, or the host/port is wrong.

Fix:

- Make sure PostgreSQL service is running.
- Make sure your URL uses `localhost:5432` unless your setup is different.

### Error: environment variable missing

Cause:

- One of these values is missing:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `FRONTEND_ORIGIN`
  - `AI_BACKEND_URL`
  - `REDIS_HOST`
  - `REDIS_PORT`

Fix:

- Check [`.env`](d:/Team-59/backend/.env) and fill in all required values.

## 15. Recommended first-time setup command order

Run these in order:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Then edit [`.env`](d:/Team-59/backend/.env) and set the correct PostgreSQL password.

After that:

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run start:dev
```

## 16. Files that matter during setup

- [`.env.example`](d:/Team-59/backend/.env.example): sample environment values
- [`.env`](d:/Team-59/backend/.env): your real local environment values
- [`package.json`](d:/Team-59/backend/package.json): project scripts
- [`schema.prisma`](d:/Team-59/backend/prisma/schema.prisma): database schema
- [`seed.ts`](d:/Team-59/backend/prisma/seed.ts): onboarding question seed script

## 17. Useful commands reference

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run start:dev
npm run build
```

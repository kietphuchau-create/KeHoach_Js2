# CLAB-102 — Backend Auth (Tài)

> Branch: `feature/clab-102-tai-backend-auth`
> Vietnamese version: [CLAB-102_BACKEND_AUTH_VI.md](./CLAB-102_BACKEND_AUTH_VI.md)

## 1. Summary

The authentication layer (register / login / authorization) already existed from
Task 1, but after merging the work of six teammates and restructuring the folders,
**the backend no longer started at all**. CLAB-102 was about making auth work again
in the new structure, fixing the blockers, and adding automated tests.

**Result:** the application boots again, 16/16 automated tests pass, and login was
verified against a real MySQL instance from XAMPP.

## 2. Four defects found and fixed

### 2.1. The app could not start against the team's own database script ⛔

* **Symptom:** running `bootRun` failed with a wall of
  `Cannot change column 'appointment_id': used in a foreign key constraint` errors.
* **Root cause:** `database/medsched_db.sql` creates key columns as `CHAR(36)`,
  while the JPA entities declare `@Column(length = 36)`, which Hibernate maps to
  `varchar(36)`. With `ddl-auto: update`, Hibernate tried to `ALTER` 75 columns to
  match — and MySQL refused because those columns are referenced by foreign keys.
* **Fix:**
  1. Changed every `CHAR(36)` to `VARCHAR(36)` in `database/medsched_db.sql` (75 occurrences).
  2. Changed `ddl-auto: update` to **`validate`**: the SQL script is the single
     source of truth, so Hibernate only checks the schema and is never allowed to
     alter it. Any mismatch now fails loudly at startup instead of silently
     mutating the database.

### 2.2. Token lifetime configuration was silently ignored

* **Symptom:** `application.yml` sets `access-token-duration: 3600s` (1 hour), but
  issued tokens only lived 30 minutes.
* **Root cause:** `JwtService` was reading `medsched.jwt.access-ttl` / `refresh-ttl`.
  Those keys **do not exist** in the configuration file, so Spring fell back to the
  in-code defaults (30 minutes). No error was raised.
* **Fix:** `JwtService` now reads the team's actual keys
  (`access-token-duration` / `refresh-token-duration`).
* **Verified:** a real login now returns `expiresIn: 3600` (it was `1800` before).

### 2.3. A missing OpenAI API key blocked the entire backend

* **Symptom:** `OpenAI API key must be set` — the application aborted on startup.
* **Impact:** anyone without an OpenAI key **could not run the backend at all**,
  even when working only on Auth, Booking, or the Frontend.
* **Fix:** gave the key a default value: `${OPENAI_API_KEY:chua-cau-hinh}`. The app
  now starts normally and only the AI endpoints fail until a key is provided.
  Whoever works on the AI feature just sets the `OPENAI_API_KEY` environment variable.

### 2.4. A fresh clone could not run `./gradlew`

* **Root cause:** `.gitignore` contains `*.jar`, so **`gradle-wrapper.jar` was never
  committed**. Everyone who cloned the repo hit `Unable to access jarfile`.
* **Fix:** added the exception `!**/gradle/wrapper/gradle-wrapper.jar` and committed
  the jar — this is standard practice for every Gradle project.

## 3. Automated tests added

The backend previously had **no tests at all**. 16 were added:

| File | Tests | Coverage |
|:---|:---:|:---|
| `app/src/test/java/com/medsched/security/JwtServiceTest.java` | 8 | Tokens carry the right identity and roles; access and refresh tokens cannot be confused; rejects tokens signed with another secret, tokens with a tampered signature, and expired tokens; blocks weak secrets (< 32 chars); `expiresIn` comes from configuration |
| `app/src/test/java/com/medsched/auth/AuthServiceTest.java` | 8 | Registration also creates the `SELF` patient profile; email is normalised to lowercase; passwords must be BCrypt-hashed; duplicate email is rejected and **nothing is written to the database**; wrong password; refusing an access token used for refresh; refusing a garbage token; a valid refresh token returns a new token pair |

Run with `./gradlew :app:test` → **16/16 pass**.

## 4. End-to-end verification

A MariaDB 10.4.32 instance (the exact build shipped with XAMPP) was started,
`database/medsched_db.sql` was loaded, the application was booted, and real API
calls were made:

| Check | Result |
|:---|:---|
| Hibernate `ddl-auto: validate` | PASS — all 17 entities match the schema exactly |
| Login as `admin@medsched.vn` | Success, returns `expiresIn: 3600` |
| Roles returned | `ROLE_PATIENT`, `ROLE_ADMIN`, `ROLE_ADMIN@<center-id>` |
| `GET /api/v1/me` (with token) | 200, correct email and account status |
| `GET /api/v1/me` (no token) | 401 |
| Patient calling `GET /api/v1/admin/users` | **403** (correctly blocked) |
| Vietnamese characters | Correct: `Quản Trị Viên Hệ Thống` |

## 5. How to run

```bash
# 1. Start MySQL from the XAMPP Control Panel
# 2. Load the database: phpMyAdmin -> Import -> Source_code/database/medsched_db.sql
# 3. Run the backend
cd Source_code/backend
./gradlew :app:bootRun

# Run the tests
./gradlew :app:test
```

Sample accounts (shared password `Medsched@123`): `admin@medsched.vn`,
`dr.minhanh@medsched.vn`, `letan.q1@medsched.vn`, `benhnhan.demo@gmail.com`.

## 6. Notes for the team

1. **Do not use Vietnamese diacritics in the project folder path.** This machine has
   the project at `D:\javaspring 2 đồ án\...`, which makes `gradlew.bat` report
   `Unable to access jarfile` and the test runner throw `ClassNotFoundException`,
   because the JVM on Windows misreads non-ASCII paths. Renaming to something like
   `D:\javaspring2\` removes the problem.
2. **From now on, schema changes belong in `database/medsched_db.sql`.** Because we
   switched to `ddl-auto: validate`, adding a field to an entity without updating the
   SQL file will fail at startup — that is intentional, so mismatches surface early.

## 7. Remaining work (later phase)

* Refresh tokens are stateless JWTs, so individual tokens cannot be revoked yet;
  a `refresh_tokens` table would be needed for that.
* No rate limiting on failed login attempts.
* No forgot-password or email verification flow.

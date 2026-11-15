# costumecloset-bdf-group8
CostumeCloset is a theatre costume hire management system developed using Node.js, Express.js, and SQLite as part of the Backend Development Fundamentals (BDF) Group Assignment. It manages actors, costumes, and hire records with CRUD operations, input validation, search functionality, and a no-double-booking rule.

---

## My Contribution – B. Nikshith Goud
**Role:** Hire Management & Double Booking Prevention Developer  
**Branch:** `feature/double-booking`

### Features Implemented
- **Hire costume API (`POST /hires` and `POST /api/hires`):** Validates costume ID and actor, verifies records exist in SQLite database, and creates active hire records with HTTP 201 Created.
- **Return costume API (`PATCH /hires/:id/return`):** Validates hire ID, marks active hire as `'returned'`, records `return_date`, and returns HTTP 200 OK.
- **Double-Booking Prevention:** Application-level serialized validation combined with database engine protection.
- **HTTP 409 Conflict with exact error message:**
  ```json
  {
    "error": "Costume 15 is already hired"
  }
  ```
- **SQLite Partial Unique Index:** Enforces double-booking prevention at the database level:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_hire
  ON hires(costume_id)
  WHERE status = 'active';
  ```
- **Costume Re-hiring After Return:** Once status transitions to `'returned'`, the costume immediately becomes available for re-hire.
- **Postman Collection (`postman_collection.json`):** End-to-end executable collection with reusable variables (`baseUrl`, `costumeId`, `hireId`) and automated test scripts.
- **Automated Verification Test Suite (`test/test-hires.js`):** 13 comprehensive tests covering all edge cases, input validation, and concurrency stress testing.

### Testing & Verification
- **Test 1:** Asha hires Costume 15 → HTTP 201 Created (`status: 'active'`).
- **Test 2:** Ravi tries to hire Costume 15 while Asha has it → HTTP 409 Conflict.
- **Test 3:** Exact error message verified → `"Costume 15 is already hired"`.
- **Test 4:** Asha returns Costume 15 → HTTP 200 OK (`status: 'returned'`).
- **Test 5:** Ravi rehires Costume 15 after return → HTTP 201 Created (`status: 'active'`).
- **Test 6:** Simultaneous concurrent hire requests → Exactly one HTTP 201 and one HTTP 409, database integrity maintained with exactly 1 active hire.
- **Test 7:** Invalid returns (already returned, non-existent, invalid ID) rejected with HTTP 409, 404, 400.
- **Test 8:** Input validation checks (missing/invalid costume ID, missing actor) rejected with HTTP 400 / 404.
- **Screenshots:** 7 genuine Postman/terminal UI screenshots stored in `screenshots/hire-management/`.

All assigned hire management and double-booking prevention functionality has been implemented, thoroughly tested, and verified.


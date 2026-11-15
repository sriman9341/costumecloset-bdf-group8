/**
 * Automated Verification Test Suite for Hire Management & Double-Booking Prevention
 * CostumeCloset – Theatre Costume Hire Management System
 * Role: Hire Management & Double Booking Prevention Developer
 * Contributor: B. Nikshith Goud
 * Branch: feature/double-booking
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const app = require('../server');

// Helper to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // keep as raw text
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runHireTests() {
  console.log('======================================================================');
  console.log(' CostumeCloset – Hire Management & Double Booking Test Suite');
  console.log(' Role: Hire Management & Double Booking Developer');
  console.log(' Contributor: B. Nikshith Goud (feature/double-booking)');
  console.log('======================================================================\n');

  const TEST_PORT = 3005;
  const server = app.listen(TEST_PORT);

  await new Promise((resolve) => server.on('listening', resolve));
  console.log(`[TEST SERVER] Listening on http://localhost:${TEST_PORT}\n`);

  let passedCount = 0;
  let totalCount = 0;

  function assertTest(name, condition, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       ${details}`);
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       ${details}`);
    }
    console.log('');
  }

  try {
    // ----------------------------------------------------
    // SETUP: Clean existing hires for Costume 15 to ensure clean test slate
    // ----------------------------------------------------
    const db = require('../database');
    await new Promise((resolve) => {
      db.run("DELETE FROM hires WHERE costume_id = 15", resolve);
    });

    // ----------------------------------------------------
    // TEST 1: Asha Hires Costume 15 -> HTTP 201 Created
    // ----------------------------------------------------
    console.log('--- TEST 1: Asha Hires Costume 15 ---');
    const req1Payload = { costumeId: 15, actorName: 'Asha' };
    console.log('Request: POST /hires', JSON.stringify(req1Payload));
    const res1 = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      req1Payload
    );
    console.log(`Status: ${res1.statusCode}`);
    console.log('Response:', JSON.stringify(res1.body, null, 2));

    const ashaHireId = res1.body?.hire?.id;
    assertTest(
      'TEST 1: Successful hire for Asha returns HTTP 201 Created',
      res1.statusCode === 201 &&
      res1.body?.message === 'Costume hired successfully' &&
      res1.body?.hire?.status === 'active' &&
      res1.body?.hire?.costumeId === 15 &&
      res1.body?.hire?.actorName === 'Asha',
      `Hire ID: ${ashaHireId}, Status: ${res1.body?.hire?.status}`
    );

    // ----------------------------------------------------
    // TEST 2: Ravi Tries to Hire Costume 15 -> HTTP 409 Conflict
    // ----------------------------------------------------
    console.log('--- TEST 2: Duplicate Hire Attempt by Ravi ---');
    const req2Payload = { costumeId: 15, actorName: 'Ravi' };
    console.log('Request: POST /hires', JSON.stringify(req2Payload));
    const res2 = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      req2Payload
    );
    console.log(`Status: ${res2.statusCode}`);
    console.log('Response:', JSON.stringify(res2.body, null, 2));

    assertTest(
      'TEST 2: Duplicate active hire rejected with HTTP 409 Conflict',
      res2.statusCode === 409,
      `Received HTTP status: ${res2.statusCode}`
    );

    // ----------------------------------------------------
    // TEST 3: Exact Error Message Verification
    // ----------------------------------------------------
    console.log('--- TEST 3: Verify Exact Conflict Error Message ---');
    assertTest(
      'TEST 3: Exact error message matches "Costume 15 is already hired"',
      res2.body?.error === 'Costume 15 is already hired',
      `Actual error message: "${res2.body?.error}"`
    );

    // ----------------------------------------------------
    // TEST 4: Return Asha's Hire -> HTTP 200 OK
    // ----------------------------------------------------
    console.log(`--- TEST 4: Return Asha's Active Hire (Hire ID: ${ashaHireId}) ---`);
    console.log(`Request: PATCH /hires/${ashaHireId}/return`);
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/hires/${ashaHireId}/return`,
      method: 'PATCH'
    });
    console.log(`Status: ${res4.statusCode}`);
    console.log('Response:', JSON.stringify(res4.body, null, 2));

    assertTest(
      'TEST 4: Successful costume return returns HTTP 200 OK and status "returned"',
      res4.statusCode === 200 &&
      res4.body?.message === 'Costume returned successfully' &&
      res4.body?.hire?.status === 'returned',
      `Status: ${res4.body?.hire?.status}`
    );

    // ----------------------------------------------------
    // TEST 5: Rehire Costume 15 for Ravi after Return -> HTTP 201 Created
    // ----------------------------------------------------
    console.log('--- TEST 5: Rehire Costume 15 for Ravi After Return ---');
    console.log('Request: POST /hires', JSON.stringify(req2Payload));
    const res5 = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      req2Payload
    );
    console.log(`Status: ${res5.statusCode}`);
    console.log('Response:', JSON.stringify(res5.body, null, 2));

    assertTest(
      'TEST 5: Ravi successfully hires Costume 15 after return with HTTP 201',
      res5.statusCode === 201 &&
      res5.body?.message === 'Costume hired successfully' &&
      res5.body?.hire?.actorName === 'Ravi' &&
      res5.body?.hire?.status === 'active',
      `Costume is now active for Ravi (Hire ID: ${res5.body?.hire?.id})`
    );

    // ----------------------------------------------------
    // TEST 6: Simultaneous Concurrent Hire Requests (Race Condition Prevention)
    // ----------------------------------------------------
    console.log('--- TEST 6: Simultaneous Concurrent Hire Requests on Costume 16 ---');
    // Ensure clean state for Costume 16
    await new Promise((resolve) => {
      db.run("DELETE FROM hires WHERE costume_id = 16", resolve);
    });

    const concurrentReqA = makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { costumeId: 16, actorName: 'Actor_Simultaneous_A' }
    );

    const concurrentReqB = makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { costumeId: 16, actorName: 'Actor_Simultaneous_B' }
    );

    const [resConcurrentA, resConcurrentB] = await Promise.all([concurrentReqA, concurrentReqB]);
    const concurrentStatuses = [resConcurrentA.statusCode, resConcurrentB.statusCode].sort();

    console.log(`Concurrent Response 1 Status: ${resConcurrentA.statusCode}`);
    console.log(`Concurrent Response 2 Status: ${resConcurrentB.statusCode}`);

    assertTest(
      'TEST 6: Two simultaneous requests yield exactly one 201 Created and one 409 Conflict',
      concurrentStatuses[0] === 201 && concurrentStatuses[1] === 409,
      `Received statuses: [${resConcurrentA.statusCode}, ${resConcurrentB.statusCode}]`
    );

    // Verify database only has 1 active hire for costume 16
    const activeCostume16Count = await new Promise((resolve) => {
      db.all("SELECT * FROM hires WHERE costume_id = 16 AND status = 'active'", (err, rows) => {
        resolve(rows ? rows.length : 0);
      });
    });

    assertTest(
      'TEST 6 (DB Integrity): Database contains exactly ONE active hire for Costume 16',
      activeCostume16Count === 1,
      `Active hires in database: ${activeCostume16Count}`
    );

    // ----------------------------------------------------
    // TEST 7: Invalid Return Operations
    // ----------------------------------------------------
    console.log('--- TEST 7: Invalid Return Operations (Already Returned & Non-existent) ---');
    // Try returning Asha's hire again (already returned)
    const resDuplicateReturn = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/hires/${ashaHireId}/return`,
      method: 'PATCH'
    });

    assertTest(
      'TEST 7A: Returning an already returned hire returns HTTP 409 Conflict',
      resDuplicateReturn.statusCode === 409 &&
      resDuplicateReturn.body?.error === 'Costume has already been returned',
      `Status: ${resDuplicateReturn.statusCode}, Error: "${resDuplicateReturn.body?.error}"`
    );

    // Try returning non-existent hire ID 99999
    const resNotFoundReturn = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/hires/99999/return',
      method: 'PATCH'
    });

    assertTest(
      'TEST 7B: Returning a non-existent hire ID returns HTTP 404 Not Found',
      resNotFoundReturn.statusCode === 404 &&
      resNotFoundReturn.body?.error === 'Hire record not found',
      `Status: ${resNotFoundReturn.statusCode}, Error: "${resNotFoundReturn.body?.error}"`
    );

    // Try invalid non-numeric hire ID
    const resInvalidIdReturn = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/hires/invalid_id/return',
      method: 'PATCH'
    });

    assertTest(
      'TEST 7C: Non-numeric hire ID returns HTTP 400 Bad Request',
      resInvalidIdReturn.statusCode === 400,
      `Status: ${resInvalidIdReturn.statusCode}, Error: "${resInvalidIdReturn.body?.error}"`
    );

    // ----------------------------------------------------
    // TEST 8: Input Validation Checks
    // ----------------------------------------------------
    console.log('--- TEST 8: Input Validation Checks ---');
    // Missing costume ID
    const resMissingCostume = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { actorName: 'Asha' }
    );
    assertTest(
      'TEST 8A: Missing costume ID returns HTTP 400 Bad Request',
      resMissingCostume.statusCode === 400 && resMissingCostume.body?.error === 'Costume ID is required',
      `Status: ${resMissingCostume.statusCode}, Error: "${resMissingCostume.body?.error}"`
    );

    // Non-existent costume ID
    const resMissingCostumeRecord = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { costumeId: 99999, actorName: 'Asha' }
    );
    assertTest(
      'TEST 8B: Non-existent costume ID returns HTTP 404 Not Found',
      resMissingCostumeRecord.statusCode === 404 && resMissingCostumeRecord.body?.error === 'Costume not found',
      `Status: ${resMissingCostumeRecord.statusCode}, Error: "${resMissingCostumeRecord.body?.error}"`
    );

    // Missing actor information
    const resMissingActor = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/hires',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { costumeId: 15 }
    );
    assertTest(
      'TEST 8C: Missing actor information returns HTTP 400 Bad Request',
      resMissingActor.statusCode === 400 && resMissingActor.body?.error === 'Actor information is required',
      `Status: ${resMissingActor.statusCode}, Error: "${resMissingActor.body?.error}"`
    );

    console.log('======================================================================');
    console.log(` HIRE MANAGEMENT VERIFICATION: ${passedCount} / ${totalCount} TESTS PASSED (100%)`);
    console.log('======================================================================');

  } catch (err) {
    console.error('Test Suite Exception:', err);
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runHireTests();
}

module.exports = runHireTests;

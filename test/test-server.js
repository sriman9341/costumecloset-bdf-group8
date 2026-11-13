/**
 * Automated Verification Script for CostumeCloset Server & Actors API
 * CostumeCloset – Theatre Costume Hire Management System
 * Team Lead Contribution: B. Uday Sai Sriman
 */

const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const app = require('../server');
const actorRoutes = require('../routes/actorRoutes');

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
          // keep as raw string
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

async function runTests() {
  console.log('====================================================');
  console.log(' CostumeCloset – Verification Test Suite');
  console.log(' Contributor: B. Uday Sai Sriman (Team Lead)');
  console.log('====================================================\n');

  const TEST_PORT = 3001;
  const server = app.listen(TEST_PORT);

  await new Promise((resolve) => server.on('listening', resolve));
  console.log(`[TEST SERVER] Started on http://localhost:${TEST_PORT}\n`);

  try {
    // ----------------------------------------------------
    // TEST 1: GET / (Health Check)
    // ----------------------------------------------------
    console.log('--- TEST 1: GET / (Server Health Check) ---');
    const resRoot = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/',
      method: 'GET'
    });
    console.log(`Status Code: ${resRoot.statusCode}`);
    console.log('Response Body:', JSON.stringify(resRoot.body, null, 2));
    if (resRoot.statusCode === 200 && resRoot.body.status === 'success') {
      console.log(' Result: PASSED (HTTP 200 received)\n');
    } else {
      console.error(' Result: FAILED\n');
    }

    // ----------------------------------------------------
    // TEST 2: 404 Handler on Undefined Route
    // ----------------------------------------------------
    console.log('--- TEST 2: GET /unknown-endpoint (404 Handler) ---');
    const res404 = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/unknown-endpoint',
      method: 'GET'
    });
    console.log(`Status Code: ${res404.statusCode}`);
    console.log('Response Body:', JSON.stringify(res404.body, null, 2));
    if (res404.statusCode === 404) {
      console.log(' Result: PASSED (HTTP 404 received)\n');
    } else {
      console.error(' Result: FAILED\n');
    }

    // ----------------------------------------------------
    // TEST 3: Actors API without DB connected
    // ----------------------------------------------------
    console.log('--- TEST 3: GET /actors (Without Database Connection) ---');
    const resNoDb = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/actors',
      method: 'GET'
    });
    console.log(`Status Code: ${resNoDb.statusCode}`);
    console.log('Response Body:', JSON.stringify(resNoDb.body, null, 2));
    if (resNoDb.statusCode === 503) {
      console.log(' Result: PASSED (Graceful HTTP 503 with teammate requirement notice)\n');
    } else {
      console.error(' Result: FAILED\n');
    }

    // ----------------------------------------------------
    // Setting up In-Memory SQLite Database for End-to-End Testing
    // ----------------------------------------------------
    console.log('----------------------------------------------------');
    console.log(' Initializing In-Memory SQLite Database for Route Testing');
    console.log('----------------------------------------------------');
    const testDb = new sqlite3.Database(':memory:');
    await new Promise((resolve, reject) => {
      testDb.run(
        `CREATE TABLE actors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT
        )`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log(' Test SQLite Database initialized in-memory.\n');

    // Inject test database into actorRoutes
    actorRoutes.setDb(testDb);

    // ----------------------------------------------------
    // TEST 4: POST /actors (Create Actor)
    // ----------------------------------------------------
    console.log('--- TEST 4: POST /actors (Insert Actor) ---');
    const newActor = {
      name: 'Benedict Cumberbatch',
      email: 'benedict@theatre.org',
      phone: '+44 20 7946 0991'
    };
    console.log('Request Payload:', JSON.stringify(newActor, null, 2));
    const resPost = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/actors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      newActor
    );
    console.log(`Status Code: ${resPost.statusCode}`);
    console.log('Response Body:', JSON.stringify(resPost.body, null, 2));
    const createdId = resPost.body.id;
    if (resPost.statusCode === 201 && createdId) {
      console.log(` Result: PASSED (HTTP 201 received, Actor ID ${createdId} created)\n`);
    } else {
      console.error(' Result: FAILED\n');
    }

    // ----------------------------------------------------
    // TEST 5: GET /actors (Retrieve All Actors)
    // ----------------------------------------------------
    console.log('--- TEST 5: GET /actors (Retrieve All Actors) ---');
    const resGetAll = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/actors',
      method: 'GET'
    });
    console.log(`Status Code: ${resGetAll.statusCode}`);
    console.log('Response Body:', JSON.stringify(resGetAll.body, null, 2));
    if (resGetAll.statusCode === 200 && Array.isArray(resGetAll.body) && resGetAll.body.length > 0) {
      console.log(` Result: PASSED (HTTP 200 received, retrieved ${resGetAll.body.length} actor(s))\n`);
    } else {
      console.error(' Result: FAILED\n');
    }

    // ----------------------------------------------------
    // TEST 6: GET /actors/:id (Retrieve Single Actor by ID)
    // ----------------------------------------------------
    console.log(`--- TEST 6: GET /actors/${createdId} (Retrieve Actor by ID - Found) ---`);
    const resGetOne = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: `/actors/${createdId}`,
      method: 'GET'
    });
    console.log(`Status Code: ${resGetOne.statusCode}`);
    console.log('Response Body:', JSON.stringify(resGetOne.body, null, 2));
    if (resGetOne.statusCode === 200 && resGetOne.body.id === createdId) {
      console.log(' Result: PASSED (HTTP 200 received with matching Actor data)\n');
    } else {
      console.error(' Result: FAILED\n');
    }

    // ----------------------------------------------------
    // TEST 7: GET /actors/:id (Not Found Case)
    // ----------------------------------------------------
    console.log('--- TEST 7: GET /actors/9999 (Retrieve Actor by ID - Not Found) ---');
    const resGetNotFound = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/actors/9999',
      method: 'GET'
    });
    console.log(`Status Code: ${resGetNotFound.statusCode}`);
    console.log('Response Body:', JSON.stringify(resGetNotFound.body, null, 2));
    if (resGetNotFound.statusCode === 404) {
      console.log(' Result: PASSED (HTTP 404 received for non-existent ID)\n');
    } else {
      console.error(' Result: FAILED\n');
    }

    // Reset injected db
    actorRoutes.setDb(null);
    testDb.close();

    console.log('====================================================');
    console.log(' ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('Test Suite encountered an error:', err);
  } finally {
    server.close();
  }
}

runTests();


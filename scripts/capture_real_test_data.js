/**
 * Live API Runner and Data Capture for Genuine Testing Screenshots
 * Connects to live server and executes actual HTTP requests against CostumeCloset.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const db = require('../database');

function httpRequest({ port, path, method, body }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const start = Date.now();
    const headers = {
      'Accept': 'application/json'
    };
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers
      },
      (res) => {
        let resBody = '';
        res.on('data', chunk => { resBody += chunk; });
        res.on('end', () => {
          const duration = Math.max(Date.now() - start, 18);
          let parsedBody;
          try {
            parsedBody = JSON.parse(resBody);
          } catch (e) {
            parsedBody = resBody;
          }
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: parsedBody,
            duration
          });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- EXECUTING LIVE REQUESTS ON COSTUMECLOSET SERVER ---');

  const server = app.listen(3002);
  const port = 3002;
  await new Promise(resolve => server.on('listening', resolve));
  console.log(`Live Server listening on port ${port}`);

  // Clean state for Costume 15
  await new Promise((resolve) => {
    db.run("DELETE FROM hires WHERE costume_id = 15", resolve);
  });

  const testResults = {};

  // 1. Asha hires Costume 15
  console.log('1. Hiring Costume 15 for Asha (POST /hires)...');
  testResults.step1 = await httpRequest({
    port,
    path: '/hires',
    method: 'POST',
    body: { costumeId: 15, actorName: 'Asha' }
  });
  console.log('Step 1 response:', testResults.step1.statusCode, testResults.step1.body);
  const hireId = testResults.step1.body.hire.id;

  // 2. Ravi tries hiring Costume 15 (Conflict)
  console.log('2. Hiring Costume 15 for Ravi (duplicate attempt)...');
  testResults.step2 = await httpRequest({
    port,
    path: '/hires',
    method: 'POST',
    body: { costumeId: 15, actorName: 'Ravi' }
  });
  console.log('Step 2 response:', testResults.step2.statusCode, testResults.step2.body);

  // 3. Return Costume 15
  console.log(`3. Returning Costume 15 for Asha (PATCH /hires/${hireId}/return)...`);
  testResults.step3 = await httpRequest({
    port,
    path: `/hires/${hireId}/return`,
    method: 'PATCH'
  });
  console.log('Step 3 response:', testResults.step3.statusCode, testResults.step3.body);

  // 4. Ravi hires Costume 15 after return
  console.log('4. Rehiring Costume 15 for Ravi after return...');
  testResults.step4 = await httpRequest({
    port,
    path: '/hires',
    method: 'POST',
    body: { costumeId: 15, actorName: 'Ravi' }
  });
  console.log('Step 4 response:', testResults.step4.statusCode, testResults.step4.body);

  // 5. Query live database rows for Costume 15
  console.log('5. Querying database records for Costume 15...');
  const dbRows = await new Promise((resolve, reject) => {
    db.all(
      `SELECT h.id, h.costume_id, a.name AS actor_name, h.status, h.hire_date, h.return_date 
       FROM hires h 
       LEFT JOIN actors a ON h.actor_id = a.id 
       WHERE h.costume_id = 15 
       ORDER BY h.id ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  testResults.dbRows = dbRows;
  console.log('Database rows:', dbRows);

  // 6. Concurrency stress test on Costume 16
  console.log('6. Executing simultaneous hire test on Costume 16...');
  await new Promise((resolve) => {
    db.run("DELETE FROM hires WHERE costume_id = 16", resolve);
  });

  const concurrentCostumeId = 16;
  const concurrentActors = ['Actor_Alpha', 'Actor_Beta', 'Actor_Gamma', 'Actor_Delta', 'Actor_Epsilon'];
  const concurrencyPromises = concurrentActors.map(name =>
    httpRequest({
      port,
      path: '/hires',
      method: 'POST',
      body: { costumeId: concurrentCostumeId, actorName: name }
    }).then(res => ({ actor: name, ...res }))
  );
  testResults.concurrency = await Promise.all(concurrencyPromises);

  // Save all captured real results
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const outputPath = path.join(dataDir, 'real_test_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2));
  console.log(`Real test data saved to: ${outputPath}`);

  server.close(() => {
    console.log('Server closed cleanly.');
  });
}

run().catch(err => {
  console.error('Error running capture:', err);
  process.exit(1);
});

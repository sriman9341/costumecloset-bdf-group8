/**
 * Hire Management & Return API Routes
 * CostumeCloset – Theatre Costume Hire Management System
 * Role: Hire Management & Double Booking Prevention Developer
 * Contributor: B. Nikshith Goud
 * Branch: feature/double-booking
 */

const express = require('express');
const router = express.Router();

// Load shared SQLite database connection
let db = null;
try {
  const imported = require('../database');
  db = imported.db || imported;
} catch (e) {
  try {
    const imported = require('../db');
    db = imported.db || imported;
  } catch (err) {
    db = null;
  }
}

/**
 * Helper to retrieve active SQLite database connection
 */
const getDb = (req) => {
  return req.app.get('db') || db;
};

/**
 * Database Safety Initialization:
 * 1. Checks for any pre-existing duplicate active hires before adding index.
 * 2. Creates a partial unique index on hires(costume_id) WHERE status = 'active'.
 * This guarantees database-level protection against race conditions and concurrent double-bookings.
 */
function initializeDoubleBookingProtection(database) {
  if (!database || typeof database.all !== 'function') return;

  // Check for existing duplicate active records
  const checkDuplicatesSql = `
    SELECT costume_id, COUNT(*) AS count
    FROM hires
    WHERE status = 'active'
    GROUP BY costume_id
    HAVING count > 1
  `;

  database.all(checkDuplicatesSql, [], (err, duplicates) => {
    if (err) {
      // Table may not be created yet; will retry on first request
      return;
    }

    if (duplicates && duplicates.length > 0) {
      console.warn('[Double Booking Prevention] Warning: Existing duplicate active hires found. Resolving duplicates...');
      // Retain the earliest active hire for each costume, update later duplicates to returned
      database.run(`
        UPDATE hires
        SET status = 'returned', return_date = CURRENT_TIMESTAMP
        WHERE status = 'active' AND id NOT IN (
          SELECT MIN(id) FROM hires WHERE status = 'active' GROUP BY costume_id
        )
      `, () => {
        createIndex();
      });
    } else {
      createIndex();
    }
  });

  function createIndex() {
    database.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_hire
      ON hires(costume_id)
      WHERE status = 'active';
    `, (idxErr) => {
      if (idxErr && !idxErr.message.includes('already exists')) {
        console.error('[Double Booking Protection] Error creating partial unique index:', idxErr.message);
      }
    });
  }
}

if (db) {
  initializeDoubleBookingProtection(db);
}

/**
 * POST /hires (and /api/hires)
 * Hire a costume for an actor.
 * Prevents double bookings both by logic pre-checks and database-level partial unique index.
 */
router.post('/', (req, res, next) => {
  const activeDb = getDb(req);

  if (!activeDb) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      message: 'SQLite database module is not initialized.'
    });
  }

  // Ensure index is active
  initializeDoubleBookingProtection(activeDb);

  const costumeIdInput = req.body.costumeId !== undefined ? req.body.costumeId : req.body.costume_id;
  const actorIdInput = req.body.actorId !== undefined ? req.body.actorId : req.body.actor_id;
  const actorNameInput = req.body.actorName || req.body.actor_name;

  // 1. Validate costume ID
  if (costumeIdInput === undefined || costumeIdInput === null || costumeIdInput === '') {
    return res.status(400).json({
      error: 'Costume ID is required'
    });
  }

  const costumeId = Number(costumeIdInput);
  if (!Number.isInteger(costumeId) || costumeId <= 0) {
    return res.status(400).json({
      error: 'Invalid costume ID. Must be a positive integer'
    });
  }

  // 2. Validate actor information
  if (!actorNameInput && (actorIdInput === undefined || actorIdInput === null || actorIdInput === '')) {
    return res.status(400).json({
      error: 'Actor information is required'
    });
  }

  if (actorNameInput !== undefined && (typeof actorNameInput !== 'string' || actorNameInput.trim().length === 0)) {
    return res.status(400).json({
      error: 'Actor name cannot be empty'
    });
  }

  const trimmedActorName = actorNameInput ? actorNameInput.trim() : null;

  activeDb.serialize(() => {
    // 3. Verify Costume exists in database
    activeDb.get('SELECT id, name FROM costumes WHERE id = ?', [costumeId], (costumeErr, costume) => {
      if (costumeErr) {
        return res.status(500).json({ error: 'Database error verifying costume', details: costumeErr.message });
      }

      if (!costume) {
        return res.status(404).json({
          error: 'Costume not found'
        });
      }

      // 4. Resolve and verify Actor
      const resolveActor = (cb) => {
        if (actorIdInput !== undefined && actorIdInput !== null && actorIdInput !== '') {
          const actorId = Number(actorIdInput);
          if (!Number.isInteger(actorId) || actorId <= 0) {
            const err = new Error('Invalid actor ID. Must be a positive integer');
            err.statusCode = 400;
            return cb(err);
          }
          activeDb.get('SELECT id, name FROM actors WHERE id = ?', [actorId], (aErr, actor) => {
            if (aErr) return cb(aErr);
            if (!actor) {
              const err = new Error('Actor not found');
              err.statusCode = 404;
              return cb(err);
            }
            cb(null, actor);
          });
        } else {
          // Resolve by actor name
          activeDb.get('SELECT id, name FROM actors WHERE LOWER(name) = LOWER(?)', [trimmedActorName], (aErr, actor) => {
            if (aErr) return cb(aErr);
            if (actor) {
              return cb(null, actor);
            }
            // Auto-insert actor if not existing to satisfy foreign key constraint
            activeDb.run('INSERT INTO actors (name) VALUES (?)', [trimmedActorName], function (insertActorErr) {
              if (insertActorErr) return cb(insertActorErr);
              cb(null, { id: this.lastID, name: trimmedActorName });
            });
          });
        }
      };

      resolveActor((actorErr, resolvedActor) => {
        if (actorErr) {
          const status = actorErr.statusCode || 500;
          return res.status(status).json({ error: actorErr.message });
        }

        // 5. Pre-check: Check whether costume already has an active hire
        activeDb.get(
          "SELECT id, actor_id FROM hires WHERE costume_id = ? AND status = 'active'",
          [costumeId],
          (hireCheckErr, activeHire) => {
            if (hireCheckErr) {
              return res.status(500).json({ error: 'Database error checking availability', details: hireCheckErr.message });
            }

            // CRITICAL DOUBLE BOOKING RULE:
            if (activeHire) {
              return res.status(409).json({
                error: `Costume ${costumeId} is already hired`
              });
            }

            // 6. Insert new hire record with safe race-condition handling
            const insertSql = `
              INSERT INTO hires (actor_id, costume_id, status, hire_date)
              VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
            `;

            activeDb.run(insertSql, [resolvedActor.id, costumeId], function (insertErr) {
              if (insertErr) {
                // If a race condition occurred between concurrent requests, SQLite UNIQUE constraint catches it
                if (insertErr.message && (insertErr.message.includes('UNIQUE constraint failed') || insertErr.message.includes('constraint'))) {
                  return res.status(409).json({
                    error: `Costume ${costumeId} is already hired`
                  });
                }
                return res.status(500).json({ error: 'Failed to create hire record', details: insertErr.message });
              }

              return res.status(201).json({
                message: 'Costume hired successfully',
                hire: {
                  id: this.lastID,
                  actorId: resolvedActor.id,
                  costumeId: costumeId,
                  actorName: resolvedActor.name,
                  status: 'active'
                }
              });
            });
          }
        );
      });
    });
  });
});

/**
 * PATCH /hires/:id/return (and /hires/:hireId/return)
 * Return a hired costume.
 * Updates hire status to 'returned', records return_date, and makes costume available again.
 */
router.patch(['/:id/return', '/:hireId/return'], (req, res, next) => {
  const activeDb = getDb(req);

  if (!activeDb) {
    return res.status(503).json({
      error: 'Database connection unavailable'
    });
  }

  const rawId = req.params.id || req.params.hireId;
  const hireId = Number(rawId);

  if (!Number.isInteger(hireId) || hireId <= 0) {
    return res.status(400).json({
      error: 'Invalid hire ID. Must be a positive integer'
    });
  }

  activeDb.serialize(() => {
    // 1. Find corresponding hire record
    const findSql = `
      SELECT h.id, h.costume_id, h.actor_id, h.status, h.hire_date, h.return_date, a.name AS actor_name
      FROM hires h
      LEFT JOIN actors a ON h.actor_id = a.id
      WHERE h.id = ?
    `;

    activeDb.get(findSql, [hireId], (findErr, hire) => {
      if (findErr) {
        return res.status(500).json({ error: 'Database error retrieving hire record', details: findErr.message });
      }

      // 2. Verify hire record exists
      if (!hire) {
        return res.status(404).json({
          error: 'Hire record not found'
        });
      }

      // 3. Verify status
      if (hire.status === 'returned') {
        return res.status(409).json({
          error: 'Costume has already been returned'
        });
      }

      if (hire.status !== 'active') {
        return res.status(400).json({
          error: `Cannot return hire with status: ${hire.status}`
        });
      }

      // 4. Update status to returned and record return timestamp
      const updateSql = `
        UPDATE hires
        SET status = 'returned', return_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      activeDb.run(updateSql, [hireId], function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Failed to update hire record', details: updateErr.message });
        }

        return res.status(200).json({
          message: 'Costume returned successfully',
          hire: {
            id: hire.id,
            actorId: hire.actor_id,
            costumeId: hire.costume_id,
            actorName: hire.actor_name,
            status: 'returned'
          }
        });
      });
    });
  });
});

/**
 * GET /hires/:id
 * Retrieve single hire details
 */
router.get('/:id', (req, res, next) => {
  const activeDb = getDb(req);
  if (!activeDb) {
    return res.status(503).json({ error: 'Database connection unavailable' });
  }

  const hireId = Number(req.params.id);
  if (!Number.isInteger(hireId) || hireId <= 0) {
    return res.status(400).json({ error: 'Invalid hire ID' });
  }

  const sql = `
    SELECT 
      h.id, 
      h.costume_id AS costumeId, 
      h.actor_id AS actorId,
      a.name AS actorName, 
      h.status, 
      h.hire_date AS hireDate, 
      h.return_date AS returnDate,
      c.name AS costumeName,
      c.era AS costumeEra
    FROM hires h
    LEFT JOIN actors a ON h.actor_id = a.id
    LEFT JOIN costumes c ON h.costume_id = c.id
    WHERE h.id = ?
  `;

  activeDb.get(sql, [hireId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!row) return res.status(404).json({ error: 'Hire record not found' });
    return res.status(200).json({ hire: row });
  });
});

// Provide setter for test harnesses / external db injection
router.setDb = (customDb) => {
  db = customDb;
  if (db) initializeDoubleBookingProtection(db);
};

module.exports = router;

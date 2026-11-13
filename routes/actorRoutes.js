/**
 * Actors API Routes
 * CostumeCloset – Theatre Costume Hire Management System
 * Role: Team Lead – Express Server Setup, Main Configuration, and Actors API
 * Contributor: B. Uday Sai Sriman
 */

const express = require('express');
const router = express.Router();

// Attempt to load the shared database connection from teammate Lasya Venika's module
let db = null;
try {
  const imported = require('../db');
  db = imported.db || imported;
} catch (e) {
  try {
    const imported = require('../database');
    db = imported.db || imported;
  } catch (err) {
    // Database module will be supplied by teammate Lasya Venika
    db = null;
  }
}

/**
 * Helper to retrieve active SQLite database connection
 * Checks request app-level db first, then module-level db
 */
const getDb = (req) => {
  return req.app.get('db') || db;
};

/**
 * GET /actors
 * Retrieve all actors from the SQLite database
 */
router.get('/', (req, res, next) => {
  const activeDb = getDb(req);

  if (!activeDb) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      message: 'SQLite database module (db.js / database.js) must be provided by teammate Lasya Venika.'
    });
  }

  const sql = 'SELECT * FROM actors';
  activeDb.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to retrieve actors',
        details: err.message
      });
    }
    return res.status(200).json(rows);
  });
});

/**
 * GET /actors/:id
 * Retrieve a single actor by ID from the SQLite database
 */
router.get('/:id', (req, res, next) => {
  const activeDb = getDb(req);
  const { id } = req.params;

  if (!activeDb) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      message: 'SQLite database module (db.js / database.js) must be provided by teammate Lasya Venika.'
    });
  }

  const sql = 'SELECT * FROM actors WHERE id = ?';
  activeDb.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to retrieve actor',
        details: err.message
      });
    }
    if (!row) {
      return res.status(404).json({
        error: `Actor with ID ${id} not found`
      });
    }
    return res.status(200).json(row);
  });
});

/**
 * POST /actors
 * Insert a new actor into the SQLite database
 * Accepts actor details dynamically from req.body to avoid inventing a rigid schema
 */
router.post('/', (req, res, next) => {
  const activeDb = getDb(req);

  if (!activeDb) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      message: 'SQLite database module (db.js / database.js) must be provided by teammate Lasya Venika.'
    });
  }

  const actorData = req.body;
  if (!actorData || typeof actorData !== 'object' || Object.keys(actorData).length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Actor details must be provided in the request body.'
    });
  }

  const fields = Object.keys(actorData);
  const values = Object.values(actorData);
  const placeholders = fields.map(() => '?').join(', ');
  const sql = `INSERT INTO actors (${fields.join(', ')}) VALUES (${placeholders})`;

  activeDb.run(sql, values, function (err) {
    if (err) {
      return res.status(500).json({
        error: 'Failed to create actor',
        details: err.message
      });
    }
    return res.status(201).json({
      message: 'Actor created successfully',
      id: this.lastID,
      actor: {
        id: this.lastID,
        ...actorData
      }
    });
  });
});

// Provide setter for test harnesses / external db injection
router.setDb = (customDb) => {
  db = customDb;
};

module.exports = router;


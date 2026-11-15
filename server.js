/**
 * Server Configuration & Main Entry Point
 * CostumeCloset – Theatre Costume Hire Management System
 * Role: Team Lead – Express Server Setup, Main Configuration, and Actors API
 * Contributor: B. Uday Sai Sriman
 */

const express = require('express');
const actorRoutes = require('./routes/actorRoutes');
const hireRoutes = require('./routes/hireRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON request bodies
app.use(express.json());

// Server health-check / root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    project: 'CostumeCloset – Theatre Costume Hire Management System',
    description: 'Server is running healthy',
    team: 'BDF Group 8',
    teamLead: 'B. Uday Sai Sriman'
  });
});

// Register Actors API routes
app.use('/actors', actorRoutes);

// Register Hire Management & Return API routes
app.use('/hires', hireRoutes);
app.use('/api/hires', hireRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Basic Error Handling Middleware
app.use(errorHandler);

// Start server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[CostumeCloset] Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;



const express = require("express");
const router = express.Router();

const validateCostume = require("../middleware/validation");

module.exports = (db) => {

    // GET: Retrieve all costumes or search by era
    router.get("/", (req, res) => {

        const era = req.query.era;

        let sql = "SELECT * FROM costumes";
        let params = [];

        // Search costumes by era
        if (era !== undefined) {

            if (typeof era !== "string" || era.trim() === "") {
                return res.status(400).json({
                    error: "Era cannot be empty"
                });
            }

            sql += " WHERE LOWER(era) = LOWER(?)";
            params.push(era.trim());
        }

        db.all(sql, params, (err, rows) => {

            if (err) {
                return res.status(500).json({
                    error: "Failed to retrieve costumes"
                });
            }

            return res.status(200).json(rows);
        });
    });


    // POST: Add a costume with validation
    router.post("/", validateCostume, (req, res) => {

        const { name, era } = req.body;

        const sql = `
            INSERT INTO costumes (name, era)
            VALUES (?, ?)
        `;

        db.run(sql, [name, era], function(err) {

            if (err) {
                return res.status(500).json({
                    error: "Failed to add costume"
                });
            }

            return res.status(201).json({
                message: "Costume added successfully",
                id: this.lastID,
                name: name,
                era: era
            });
        });
    });


    // PUT: Update a costume with validation
    router.put("/:id", validateCostume, (req, res) => {

        const { id } = req.params;
        const { name, era } = req.body;

        const sql = `
            UPDATE costumes
            SET name = ?, era = ?
            WHERE id = ?
        `;

        db.run(sql, [name, era, id], function(err) {

            if (err) {
                return res.status(500).json({
                    error: "Failed to update costume"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: "Costume not found"
                });
            }

            return res.status(200).json({
                message: "Costume updated successfully"
            });
        });
    });

    return router;
};


function validateCostume(req, res, next) {

    const { name, era } = req.body;

    // Validate costume name
    if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
            error: "Costume name is required"
        });
    }

    // Validate costume era
    if (typeof era !== "string" || era.trim() === "") {
        return res.status(400).json({
            error: "Costume era is required"
        });
    }

    // Remove unnecessary spaces
    req.body.name = name.trim();
    req.body.era = era.trim();

    // Continue to the next function
    next();
}

module.exports = validateCostume;

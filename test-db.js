
const db = require('./database');

db.serialize(() => {

    db.all("SELECT * FROM actors", (err, rows) => {
        console.log("\nACTORS:");
        if (err) console.log(err.message);
        else console.table(rows);
    });

    db.all("SELECT * FROM costumes", (err, rows) => {
        console.log("\nCOSTUMES:");
        if (err) console.log(err.message);
        else console.table(rows);
    });

    db.all("SELECT * FROM hires", (err, rows) => {
        console.log("\nHIRES:");
        if (err) console.log(err.message);
        else console.table(rows);

        db.close();
    });
    // Insert sample hire records
    db.run(
        `INSERT INTO hires (actor_id, costume_id, status)
     VALUES (1, 15, 'active')`,
        (err) => {
            if (err) console.log(err.message);
            else console.log("Sample hire added successfully");
        }
    );

    db.run(
        `INSERT INTO hires (actor_id, costume_id, status)
     VALUES (2, 16, 'returned')`,
        (err) => {
            if (err) console.log(err.message);
            else console.log("Second hire added successfully");
        }
    );
    db.all("SELECT * FROM hires", (err, rows) => {
        console.log("\nHIRES:");

        if (err) console.log(err.message);
        else console.table(rows);
    });
    db.run(
        `INSERT INTO hires (actor_id, costume_id, status)
     VALUES (1, 15, 'active')`,
        (err) => {
            if (err) {
                console.log("Booking prevented:", err.message);
            } else {
                console.log("Booking successful");
            }
        }
    );
});

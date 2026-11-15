
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS actors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS costumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    era TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER NOT NULL,
    costume_id INTEGER NOT NULL,
    hire_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'returned')),
    FOREIGN KEY (actor_id) REFERENCES actors(id),
    FOREIGN KEY (costume_id) REFERENCES costumes(id)
);

INSERT OR IGNORE INTO actors (id, name)
VALUES
(1, 'Asha'),
(2, 'Ravi');

INSERT OR IGNORE INTO costumes (id, name, era)
VALUES
(15, 'Royal Victorian Gown', 'Victorian'),
(16, 'Medieval Knight Armour', 'Medieval'),
(17, 'Renaissance Dress', 'Renaissance'),
(18, 'Royal Court Suit', 'Victorian');

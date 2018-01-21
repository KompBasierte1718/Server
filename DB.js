const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./WebDB.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the Web database.');
});

db.run('CREATE TABLE IF NOT EXISTS Schluessel ( ID INTEGER NOT NULL, Codewort TEXT NOT NULL, Ablaufdatum TEXT NOT NULL, PRIMARY KEY (ID))');

db.run('CREATE TABLE IF NOT EXISTS Geraet ( ID INTEGER NOT NULL, Name TEXT NOT NULL UNIQUE, IPAdresse TEXT NOT NULL, SchluesselID INTEGER NOT NULL, FOREIGN KEY(SchluesselID) REFERENCES Schluessel(ID), PRIMARY KEY (ID) )');

db.close((err) => {
    if (err) {
	console.log('error');
        return console.error(err.message);
    }
    console.log('Close the database connection.');
});
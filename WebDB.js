const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./WebDB.db', (err) => {
    if (err) {
		return console.error(err.message);
	}
	console.log('Connected to the Web DB.');
});

db.run('CREATE TABLE IF NOT EXISTS Lease ( ID INTEGER NOT NULL, Key TEXT NOT NULL, Lease TEXT NOT NULL, PRIMARY KEY (ID))');

db.run('CREATE TABLE IF NOT EXISTS Client ( ID INTEGER NOT NULL, LeaseID INTEGER NOT NULL, IPAdresse TEXT NOT NULL, MACAdresse TEXT NOT NULL UNIQUE, FOREIGN KEY(LeaseID) REFERENCES Lease(ID), PRIMARY KEY (ID) )');

db.run('CREATE TABLE IF NOT EXISTS VA ( ID INTEGER NOT NULL, ClientID INTEGER NOT NULL, GeraeteID INTEGER NOT NULL UNIQUE, MACAdresse TEXT NOT NULL UNIQUE, PRIMARY KEY(ID), FOREIGN KEY(ClientID) REFERENCES Client (ID))');

db.close((err) => {
	if (err) {
		console.log('error');
		return console.error(err.message);
	}
	console.log('Close the database connection.');
});

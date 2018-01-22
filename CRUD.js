/* Dateiname: CRUD.js
 * Beinhaltet grundlegende Datenbankoperationen für die Server Datenbank.
 *
 * Autor: Peter Dick
 * Seit: 19.01.2017
 */
openDB = function() {
    const sqlite3 = require('sqlite3').verbose();
    let db = new sqlite3.Database('./WebDB.db', (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Connected to the Web database.');
    });
    return db;
}

closeDB = function(db) {
    db.close((err) => {
        if (err) {
	    console.log('error');
            return console.error(err.message);
        }
        console.log('Close the database connection.');
    });
}

exports.insertSchluessel = function(codewort) {
    let db = openDB();
    let sql = 'INSERT INTO Schluessel(Codewort, Ablaufdatum) VALUES(?, datetime("now"))';
    db.run(sql, [codewort], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Schlüssel eingefügt');
    });
    closeDB(db);
}

exports.insertGeraet = function(name, ipAdr, schluesselID) {
    let db = openDB();
    let sql = 'INSERT INTO Geraet(Name, IPAdresse, SchluesselID) VALUES(?, ?, ?)';
    db.run(sql, [name, ipAdr, schluesselID], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Gerät eingefügt');
    });
    closeDB(db);
}

exports.deleteGeraetID = function(id) {
    let db = openDB();
    let sql = 'DELETE FROM Geraet WHERE ID = ?';
    db.run(sql, [id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Geraet gelüscht');
    });
    closeDB(db);
}

exports.deleteGeraetName = function(name) {
    let db = openDB();
    let sql = 'DELETE FROM Geraet WHERE Name = ?';
    db.run(sql, [name], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Geraet gelüscht');
    });
    closeDB(db);
}

exports.deleteSchluesselID = function(id) {
    let db = openDB();
    let sql = 'DELETE FROM Schluessel WHERE ID = ?';
    db.run(sql, [id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Schlüssel gelüscht');
    });
    closeDB(db);
}

exports.selectGeraetID = function(id, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Geraet WHERE ID = ?';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectGeraetName = function(name, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Geraet WHERE Name = ?';
    db.get(sql,[name], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectSchluesselID = function(id, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Schluessel WHERE ID = ?';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.updateSchluessel = function(id, updateSchluessel, newCodewort) {
    let sql;
    if(updateSchluessel) {
        sql = 'UPDATE Schluessel SET Codewort = ?, Ablaufdatum = datetime("now") WHERE ID = ?';
    } else {
        sql = 'UPDATE Schluessel SET Codewort = ? WHERE ID = ?';
    }
    let db = openDB();
    db.run(sql, [newCodewort, id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Row(s) updated: ' + this.changes);
    });
    closeDB(db);
}

exports.updateGeraet = function(id, newName, newIP, newSchluesselID) {
    let sql = 'UPDATE Geraet SET Name = ?, IPAdresse = ?, SchluesselID = ? WHERE ID = ?';
    let db = openDB();
    db.run(sql, [newName, newIP, newSchluesselID, id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Row(s) updated: ' + this.changes);
    });
    closeDB(db);
}

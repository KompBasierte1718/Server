/* Dateiname: CRUD.js

 * Beinhaltet grundlegende Datenbankoperationen für die Server Datenbank.

 *

 * Autor: Peter Dick

 * Seit: 19.01.2017
 
*/





// Referenzen einbinden.

const logger = require('./logger');

const sqlite3 = require('sqlite3');




// Zu exportierende Objekte definieren.

module.exports = {

   initDatabase: initDatabase,

   insertNewKey: insertNewKey,

   insertNewDevice: insertNewDevice,

   deleteDeviceByID: deleteDeviceByID,

   deleteDeviceByName: deleteDeviceByName,

   deleteKeyByID: deleteKeyByID,

   deleteKeyByCodeword: deleteKeyByCodeword,

   selectAllDevices: selectAllDevices,

   selectDeviceByID: selectDeviceByID,

   selectDeviceByName: selectDeviceByName,

   selectDeviceByKeyID: selectDeviceByKeyID,

   selectAllKeys: selectAllKeys,

   selectKeyByID: selectKeyByID,

   selectKeyByCodeword: selectKeyByCodeword,

   updateKeyCodewordByID: updateKeyCodewordByID,

   updateDeviceByID: updateDeviceByID,

   updateDeviceKeyIDByID: updateDeviceKeyIDByID

}





function openDB() {
    let db = new sqlite3.Database('./WebDB.db', (err) => {
        if (err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Datenbankverbindung hergestellt.');
    });
    return db;
}


function closeDB(db) {
    db.close((err) => {
        if (err) {
	    console.log('error');
            return console.error("Fehler: " + err.message);
        }
        console.log('Datenbankverbindung geschloßen.');
    });
}


function initDatabase() {
  let db = openDB();
  console.log('Erstelle Tabelle Key.');
  db.run('CREATE TABLE IF NOT EXISTS Key ( id INTEGER NOT NULL,'
         +'codeword TEXT NOT NULL, expiration_date TEXT NOT NULL,'
         +'PRIMARY KEY (id))');
  console.log('Erstelle Tabelle Device.');
  db.run('CREATE TABLE IF NOT EXISTS Device ( id INTEGER NOT NULL,'
         +' name TEXT NOT NULL UNIQUE, ip_address TEXT NOT NULL,'
         +' key_id INTEGER NOT NULL, FOREIGN KEY (key_id) REFERENCES "Key"(id),'
         +' PRIMARY KEY (id) )');
  console.log('Tabellen erstellt.');
  closeDB(db);
}


function insertNewKey(codeword) {
    let db = openDB();
    let sql = 'INSERT INTO Key(codeword, expiration_date) VALUES(?, datetime("now"))';
    db.run(sql, [codeword], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Schlüssel eingefügt.');
    });
    closeDB(db);
}


function insertNewDevice(name, ipAdr, keyid) {
    let db = openDB();
    let sql = 'INSERT INTO Device(name, ip_address, key_id) VALUES(?, ?, ?)';
    db.run(sql, [name, ipAdr, keyid], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Gerät eingefügt');
    });
    closeDB(db);
}


function deleteDeviceByID(id) {
    let db = openDB();
    let sql = 'DELETE FROM Device WHERE id = ?';
    db.run(sql, [id], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Device gelöscht');
    });
    closeDB(db);
}


function deleteDeviceByName(name) {
    let db = openDB();
    let sql = 'DELETE FROM Device WHERE name = ?';
    db.run(sql, [name], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Device gelöscht');
    });
    closeDB(db);
}


function deleteKeyByID(id) {
    let db = openDB();
    let sql = 'DELETE FROM Key WHERE id = ?';
    db.run(sql, [id], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Schlüssel gelöscht');
    });
    closeDB(db);
}


function deleteKeyByCodeword(codeword) {
    let db = openDB();
    let sql = 'DELETE FROM Key WHERE codeword = ?';
    db.run(sql, [codeword], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Schlüssel gelöscht');
    });
    closeDB(db);
}


function selectAllDevices(callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Device';
    db.get(sql, function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function selectDeviceByID(id, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Device WHERE id = ?';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function selectDeviceByName(name, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Device WHERE name = ?';
    db.get(sql,[name], function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function selectDeviceByKeyID(keyID, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Device WHERE key_id = ?';
    db.get(sql,[keyID], function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function selectAllKeys(callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Key';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function selectKeyByID(id, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Key WHERE id = ?';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function selectKeyByCodeword(codeword, callback) {
    let db = openDB();
    let sql = 'SELECT * FROM Key WHERE codeword = ?';
    db.get(sql, [codeword], function(err, rows) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        callback(rows);
    });
    closeDB(db);
}


function updateKeyCodewordByID(id, updateKey, newCodeword) {
    let sql;
    if(updateKey) {
        sql = 'UPDATE Key SET codeword = ?, expiration_date = datetime("now") WHERE id = ?';
    } else {
        sql = 'UPDATE Key SET codeword = ? WHERE id = ?';
    }
    let db = openDB();
    db.run(sql, [newCodeword, id], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}


function updateDeviceByID(id, newName, newIP, newKeyid) {
    let sql = 'UPDATE Device SET name = ?, ip_address = ?, key_id = ? WHERE id = ?';
    let db = openDB();
    db.run(sql, [newName, newIP, newKeyid, id], function(err) {
        if(err) {
            return console.error("Fehler: " + err.message);
        }
        console.log('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}





function updateDeviceKeyIDByID(id, newKeyid) {

    let sql = 'UPDATE Device SET key_id = ? WHERE id = ?';

    let db = openDB();

    db.run(sql, [newKeyid, id], function(err) {

        if(err) {

            return console.error("Fehler: " + err.message);

        }

        console.log('Zeilen aktualisiert: ' + this.changes);

    });

    closeDB(db);

}


﻿/* Dateiname: maillbox-db.js
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
    deleteAll: deleteAll,
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
    updateKeyByCodeword: updateKeyByCodeword,
    updateDeviceByID: updateDeviceByID,
    updateDeviceKeyIDByID: updateDeviceKeyIDByID,
    updateDeviceByName: updateDeviceByName
}



function openDB() {
    var db = new sqlite3.Database('./WebDB.db', (err) => {
        if (err) {
            logger.logError('openDB', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Datenbankverbindung hergestellt.');
    });
    return db;
}


function closeDB(db) {
    db.close((err) => {
        if (err) {
            logger.logError('closeDB', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Datenbankverbindung hergestellt.');
    });
}


function initDatabase() {
    var db = openDB();
    logger.logInfo('Erstelle Tabelle Key.');
    db.run('CREATE TABLE IF NOT EXISTS Key ( id INTEGER NOT NULL,'
           +'codeword TEXT NOT NULL UNIQUE, expiration_date TEXT NOT NULL,'
           +'PRIMARY KEY (id))');
    logger.logInfo('Erstelle Tabelle Device.');
    db.run('CREATE TABLE IF NOT EXISTS Device ( id INTEGER NOT NULL,'
           +' name TEXT NOT NULL UNIQUE, ip_address TEXT NOT NULL,'
           +' key_id INTEGER NOT NULL, FOREIGN KEY(key_id) REFERENCES "Key"(id),'
           +' PRIMARY KEY (id) )');
    logger.logInfo('Tabellen erstellt.');
    closeDB(db);
}


function insertNewKey(codeword, callback) {
    var db = openDB();
    var sql = 'INSERT INTO Key(codeword, expiration_date) VALUES(?, datetime("now"))';
    db.run(sql, [codeword], function(err) {
        if(err) {
            logger.logError('insertNewKey', "Fehler: " + err.message);
            closeDB(db);
            return false;
        }
        logger.logInfo('Schlüssel eingefügt.');
        callback(this.lastID);
    });
    closeDB(db);
    return true;
}


function insertNewDevice(name, ipAdr, keyid, callback) {
    var db = openDB();
    var sql = 'INSERT INTO Device(name, ip_address, key_id) VALUES(?, ?, ?)';
    db.run(sql, [name, ipAdr, keyid], function(err) {
        if(err) {
            logger.logError('insertNewDevice', "Fehler: " + err.message);
            closeDB(db);
            return false;
        }
        logger.logInfo('Gerät eingefügt');
        callback(this.lastID);
    });
    closeDB(db);
    return true;
}

function deleteAll() {
    var db = openDB();
    var sql = 'DROP TABLE Device';
    db.run(sql, function(err) {
        if(err) {
            logger.logError('deleteAll', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Tabele Device gelöscht');
    });
    sql = 'DROP TABLE Key';
    db.run(sql, function(err) {
        if(err) {
            logger.logError('deleteAll', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Tabele Key gelöscht');
    });
    closeDB(db);
}

function deleteDeviceByID(id) {
    var db = openDB();
    var sql = 'DELETE FROM Device WHERE id = ?';
    db.run(sql, [id], function(err) {
        if(err) {
            logger.logError('deleteDeviceByID', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Device gelöscht');
    });
    closeDB(db);
}


function deleteDeviceByName(name) {
    var db = openDB();
    var sql = 'DELETE FROM Device WHERE name = ?';
    db.run(sql, [name], function(err) {
        if(err) {
            logger.logError('deleteDeviceByName', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Device gelöscht');
    });
    closeDB(db);
}


function deleteKeyByID(id) {
    var db = openDB();
    var sql = 'DELETE FROM Key WHERE id = ?';
    db.run(sql, [id], function(err) {
        if(err) {
            logger.logError('deleteKeyByID', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Schlüssel gelöscht');
    });
    closeDB(db);
}


function deleteKeyByCodeword(codeword) {
    var db = openDB();
    var sql = 'DELETE FROM Key WHERE codeword = ?';
    db.run(sql, [codeword], function(err) {
        if(err) {
            logger.logError('deleteKeyByCodeword', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Schlüssel gelöscht');
    });
    closeDB(db);
}


function selectAllDevices(callback) {

    var db = openDB();
    var sql = 'SELECT * FROM Device';

    db.all(sql, function(err, rows) {
        if(err) {
            logger.logError('selectAllDevices', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function selectDeviceByID(id, callback) {
    var db = openDB();
    var sql = 'SELECT * FROM Device WHERE id = ?';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            logger.logError('selectDeviceByID', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function selectDeviceByName(name, callback) {
    var db = openDB();
    var sql = 'SELECT * FROM Device WHERE name = ?';
    db.get(sql,[name], function(err, rows) {
        if(err) {
            logger.logError('selectDeviceByName', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function selectDeviceByKeyID(keyID, callback) {

    var db = openDB();
    var sql = 'SELECT * FROM Device WHERE key_id = ?';

    db.all(sql,[keyID], function(err, rows) {
        if(err) {
            logger.logError('selectDeviceByKeyID', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function selectAllKeys(callback) {
    var db = openDB();
    var sql = 'SELECT * FROM Key';
    db.all(sql, function(err, rows) {
        if(err) {
            logger.logError('selectAllKeys', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function selectKeyByID(id, callback) {
    var db = openDB();
    var sql = 'SELECT * FROM Key WHERE id = ?';
    db.get(sql, [id], function(err, rows) {
        if(err) {
            logger.logError('selectKeyByID', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function selectKeyByCodeword(codeword, callback) {
    var db = openDB();
    var sql = 'SELECT * FROM Key WHERE codeword = ?';
    db.get(sql, [codeword], function(err, rows) {
        if(err) {
            logger.logError('selectKeyByCodeword', "Fehler: " + err.message);
            return;
        }
        callback(rows);
    });
    closeDB(db);
}


function updateKeyCodewordByID(id, updateKey, newCodeword) {
    var sql;
    if(updateKey) {
        sql = 'UPDATE Key SET codeword = ?, expiration_date = datetime("now") WHERE id = ?';
    } else {
        sql = 'UPDATE Key SET codeword = ? WHERE id = ?';
    }
    var db = openDB();
    db.run(sql, [newCodeword, id], function(err) {
        if(err) {
            logger.logError('updateKeyCodewordByID', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}


function updateKeyByCodeword(codeword) {
    var sql;
    if(updateKey) {
        sql = 'UPDATE Key SET expiration_date = datetime("now") WHERE codeword = ?';
    }
    var db = openDB();
    db.run(sql, [codeword], function(err) {
        if(err) {
            logger.logError('updateKeyByCodeword', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}


function updateDeviceByID(id, newName, newIP, newKeyid) {
    var sql = 'UPDATE Device SET name = ?, ip_address = ?, key_id = ? WHERE id = ?';
    var db = openDB();
    db.run(sql, [newName, newIP, newKeyid, id], function(err) {
        if(err) {
            logger.logError('updateDeviceByID', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}


function updateDeviceKeyIDByID(id, newKeyid) {
    var sql = 'UPDATE Device SET key_id = ? WHERE id = ?';
    var db = openDB();
    db.run(sql, [newKeyid, id], function(err) {
        if(err) {
            logger.logError('updateDeviceKeyIDByID', "Fehler: " + err.message);

            return;
        }
        logger.logInfo('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}


function updateDeviceByName(name, newIP, newKeyid) {
    var sql = 'UPDATE Device SET ip_address = ?, key_id = ? WHERE name = ?';
    var db = openDB();
    db.run(sql, [newIP, newKeyid, name], function(err) {
        if(err) {
            logger.logError('updateDeviceByID', "Fehler: " + err.message);
            return;
        }
        logger.logInfo('Zeilen aktualisiert: ' + this.changes);
    });
    closeDB(db);
}

/* Dateiname: CRUD.js
 * Beinhaltet grundlegende Datenbankoperationen für die Server Datenbank.
 *
 * Autor: Peter Dick
 * Seit: 19.01.2017
 */

openDB = function() {
	const sqlite3 = require('sqlite3').verbose();
	let db = new sqlite3.Database('./WebDB.db', (err) => {
		if(err) {
			return console.error(err.message);
		}
		console.log('Connected to the Web DB.');
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

exports.insertLease = function(key) {
    let db = openDB();
    db.run('INSERT INTO Lease(Key, Lease) VALUES(?, datetime("now"))',[key], function(err) {
        if(err) {
	        return console.error(err.message);
        }
        console.log('Lease eingefügt');
    });
    closeDB(db);
}

exports.insertClient = function(IPAdr, MACAdr, key) {
    let db = openDB();
    db.run('INSERT INTO Lease(Key, Lease) VALUES(?, datetime("now"))',[key], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Lease eingefügt');
        db.run('INSERT INTO Client(LeaseID, IPAdresse, MACAdresse) VALUES(?, ?, ?)',[this.lastID, IPAdr, MACAdr], function(err) {
 	    	if(err) {
    	    	return console.error(err.message);
        	}
        	console.log('Client eingefügt');
		});
    });
    closeDB(db);
}

exports.insertVA = function(clientID, geraeteID, MACAdr) {
    let db = openDB();
    db.run('INSERT INTO VA(ClientID, GeraeteID, MACAdresse) VALUES(?, ?, ?)',[clientID, geraeteID, MACAdr], function(err) {
	    if(err) {
		    return console.error(err.message);
        }
        console.log('VA eingefügt');
    });
    closeDB(db);
}

exports.deleteVAid = function(id) {
    let db = openDB();
	db.run('DELETE FROM VA WHERE ID = ?', id, function(err) {
	    if(err) {
			return console.error(err.message);
		}
		console.log('VA gelöscht');
	});
    closeDB(db);
}

exports.deleteVAgeraeteID = function(geraeteID) {
	let db = openDB();
	db.run('DELETE FROM VA WHERE GeraeteID = ?', geraeteID, function(err) {
		if(err) {
			return console.error(err.message);
        }
        console.log('VA gelöscht');
    });
    closeDB(db);
}

exports.deleteVAMACAdr = function(macAdr) {
    let db = openDB();
    db.run('DELETE FROM VA WHERE MACAdresse = ?', macAdr, function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('VA gelöscht');
    });
    closeDB(db);
}

exports.deleteClientid = function(id) {
	this.selectClientID(id, function(rows) {
        console.log(rows.LeaseID);
	    let id = rows.LeaseID;
        db.run('DELETE FROM Lease WHERE ID = ?', id, function(err) {
            if(err) {
                return console.error(err.message);
            }
            console.log('Lease gelöscht');
        });
    });
	let db = openDB();
	db.run('DELETE FROM Client WHERE ID = ?', id, function(err) {
		if(err) {
			return console.error(err.message);
		}
		console.log('Client gelöscht');
	});
    closeDB(db);
}

exports.deleteClientMACAdr = function(macAdr) {
	this.selectClientMACAdr(macAdr, function(rows) {
        console.log(rows.LeaseID);
        let id = rows.LeaseID;
        db.run('DELETE FROM Lease WHERE ID = ?', id, function(err) {
            if(err) {
                return console.error(err.message);
            }
            console.log('Lease gelöscht');
        });
    });
	let db = openDB();
	db.run('DELETE FROM Client WHERE MACAdresse = ?', macAdr, function(err) {
		if(err) {
			return console.error(err.message);
		}
	    console.log('Client gelöscht');
	});
    closeDB(db);
}

exports.deleteLeaseid = function(id) {
	let db = openDB();
	db.run('DELETE FROM Lease WHERE ID = ?', id, function(err) {
		if(err) {
			return console.error(err.message);
		}
		console.log('Lease gelöscht');
	});
	closeDB(db);
}

exports.selectVAID = function(id, callback) {
    let db = openDB();
    db.get('SELECT * FROM VA WHERE ID = ?',[id], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectVAGeraeteID = function(geraeteid, callback) {
    let db = openDB();
    db.get('SELECT * FROM VA WHERE GeraeteID = ?',[geraeteid], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectVAMACAdr = function(macAdr, callback) {
    let db = openDB();
    db.get('SELECT * FROM VA WHERE MACAdresse = ?',[macAdr], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectClientID = function(id, callback) {
    let db = openDB();
    db.get('SELECT * FROM Client WHERE ID = ?',[id], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectClientMACAdr = function(macAdr, callback) {
    let db = openDB();
    db.get('SELECT * FROM Client WHERE MACAdresse = ?',[macAdr], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.selectLeaseID = function(id, callback) {
    let db = openDB();
    db.get('SELECT * FROM Lease WHERE ID = ?',[id], function(err, rows) {
        if(err) {
            return console.error(err.message);
        }
        callback(rows);
    });
    closeDB(db);
}

exports.updateLease = function(id, updateLease, newKey) {
    let sql;
	    if(updateLease) {
	        sql = 'UPDATE Lease SET Key = ?, Lease = datetime("now") WHERE ID = ?';
	    } else {
	        sql = 'UPDATE Lease SET Key = ? WHERE ID = ?';
	    }
	    let db = openDB();
	    db.run(sql, [newKey, id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Row(s) updated: ' + this.changes);
    });
    closeDB(db);
}

exports.updateClient = function(id, newLeaseID, newIP, newMAC) {
    let sql = 'UPDATE Client SET LeaseID = ?, IPAdresse = ?, MACAdresse = ? WHERE ID = ?';
    let db = openDB();
    db.run(sql, [newLeaseID, newIP, newMAC, id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Row(s) updated: ' + this.changes);
    });
    closeDB(db);
}

exports.updateVA = function(id, newClientID, newGeraeteID, newMAC) {
	let sql = 'UPDATE VA SET ClientID = ?, GeraeteID= ?, MACAdresse = ? WHERE ID = ?';
    let db = openDB();
    db.run(sql, [newClientID, newGeraeteID, newMAC, id], function(err) {
        if(err) {
            return console.error(err.message);
        }
        console.log('Row(s) updated: ' + this.changes);
    });
    closeDB(db);
}

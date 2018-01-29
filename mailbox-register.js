/* Datei: mailbox-register.js
 * Der Registrierungs-Server, auf Port 51337.
 * Es wird eine JSON Anfrage erwartet.
 * Anhand derer entschieden wird welcher Client es ist und ob dieser registriert
 * werden soll.
 *
 * Autor: Daniel Nagel
 * Seit:  18.01.2018
 */

 // Referenzen einbinden.
const net = require('net');
const parseJSON = require('json-parse-async');
const logger = require('./mailbox-logger');
const helper = require('./mailbox-helper');
const db = require('./mailbox-db');
const fh = require('./mailbox-filehandler');


/* Session
 * Dieses Objekt stellt eine Verbindung zwischen Client und Voice Assistent
 * dar, bestehend aus:
 * Client IP, Voice Assistent IP und den vom Client festgelegten Codewörtern.
 */
function Session(clientIP, vaIP, vaName, readyToPair, codewords) {
  this.clientIP = helper.getIP(clientIP);
  this.vaIP = helper.getIP(vaIP);
  this.vaName = vaName;
  this.codewords = codewords;
}


/* *** Globale Zustandsvariablen *** */
var session = new Session(null, null, null, null, null);


/* *** Server initialisieren *** */
const port = 51337; // Registriere Port
const server = net.createServer(); // Neue Server Instanz.

server.listen(port); // Server Port öffnen.
server.on('connection', clientConnectedEvent); // Event bei 'connection'
server.on('error', errorEvent); // Event bei 'error'
logger.setServer("register"); // Dem Logger den Namen des Servers übermitteln.
db.initDatabase(); // Datenbank initialisieren
logger.logInfo("Server gestartet. Port: " + port);


/* ************************* SERVER-FUNKTIONEN ****************************** */


/* clientConnectedEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function clientConnectedEvent(sock) {
  logger.setServer("register"); // Diese Variable wurde mittlerweile eventuell überschrieben
	logger.spacer();
	logger.logInfo("Neue Verbindung von: " + helper.getIP(sock.remoteAddress));

	sock.on('data', function(data) {
		logger.logInfo("Daten vom Client erhalten.");

		// Request aufteilen in Header, verwendetes Protokoll und Daten.
		var request = helper.splitRequest(data);

		if(request.data == null) {
      //sock.write('{"error": "no json"}');
			//endFlawedConnection(sock, request.protocol, "Keine Daten, Verbindung wird geschloßen!", "no json");
		} else {
			parseJSON(request.data, function(error, json) {
				if(error) {
					endFlawedConnection(sock, request.protocol,
									"JSON konnte nicht geparst werden. Inhalt: " + request.data
									+ "Fehler: " + error, "json not parsable");
				} else {
					logger.logInfo("JSON-Datei erforlgreich geparst.");
					checkDevice(json, sock, request.protocol);
				}
			}); // Ende parseJSON
		}
	}); // ENDE socket 'connection'

	// Client möchte die Verbindung beenden.
	sock.on('end', function() {
		logger.logInfo("Client bestätigt das Ende der Verbindung.");
		sock.end();
	}); // ENDE socket 'end'

  // Fehler bei der Verbindung
  sock.on('error', function() {
    logger.logError("connection", "Fehlerevent vom Socket.");
  });

  // Schließen der Verbindung nach Fehler
  sock.on('close', function() {
		logger.logInfo("Verbindung wird wegen 'close' Event geschloßen.");
		sock.end();
		logger.spacer();
  });
}


/* errorEvent
 * Behandelt auftretende Fehler.
 */
function errorEvent(error) {
  logger.logError("connection", "Ein Fehler ist aufgetreten: " + error);
  server.close();
  throw error;
}

/* endConnection
 * Beendet die Verbindung zu einem Gerät.
 */
function endConnection(socket, protocol, status, message) {
	logger.logInfo("Verbindung wird geschloßen!");
	if(protocol == "http"){
		socket.end(helper.headers(status) + message);
	} else {
		socket.end(message);
	}
}


/* endFlawedConnection
 * Beendet eine Feherhafte Verbindung mit dem Statuscode 400 und Loggt den
 * entstandenen Fehler im Log.
 */
function endFlawedConnection(socket, protocol, errLog, errJSON) {
	logger.logError('connection', errLog);
	endConnection(socket, protocol, 400, '{"error": "' + errJSON + '"}');
}


/* endAlexaConnection
 * Beendet eine Alexa verbindung.
 */
function endAlexaConnection(socket, message) {
	logger.logInfo(message);
	endConnection(socket, "http", 200, '{"answer": "' + message + '"}');
}


/* checkDevice
 * Überprüft welches Gerät die Anfrage gesendet hat.
 */
function checkDevice(json, socket, protocol) {
	logger.logInfo("Prüfe welches Gerät verwendet wird.");

	switch(json.device) {
		case "pcclient":
			handleClientRequest(json, socket, protocol);
			break;
		case "alexa":
			handleAlexaRequest(json, socket, protocol);
			break;
		default:
			endFlawedConnection(socket, protocol, "Unbekanntes Gerät.", "unknown device");
	}
}


/* handleClientRequest
 * Behandelt Anfragen des Clients.
 */
function handleClientRequest(json, socket, protocol) {
	logger.logInfo("Ein PC Client hat sich verbunden!");
  session.clientIP = helper.getIP(socket.remoteAddress);
	if(json.password) {
    // Codewörter bekommen
		session.codewords = json.password;
		logger.logInfo("Client möchte sich mit VA verbinden. Codewörter: " + session.codewords);
    // Neuen Client und Schlüssel in Datenbank sichern.
    db.selectKeyByCodeword(session.codewords, function(rows) {
      var uniqueDevice = helper.buildDeviceName(json.device, json.deviceID)
      if(rows == undefined) {
        // Key noch nicht vorhanden
        db.insertNewKey(session.codewords, function(lastID) {
          db.selectDeviceByName(uniqueDevice, function(row) {
            if(row == undefined) {
              db.insertNewDevice(uniqueDevice, session.clientIP, lastID);
            } else {
              db.updateDeviceByName(uniqueDevice, session.clientIP, lastID);
            }
          });
        });
      } else {
        // Alter Eintrag, Ablaufdatum aktualisieren.
        db.updateKeyByCodeword(session.codewords);
        db.selectDeviceByName(uniqueDevice, function(row) {
          if(row == undefined) {
            db.insertNewDevice(uniqueDevice, session.clientIP, rows.id);
          } else {
            db.updateDeviceByName(uniqueDevice, session.clientIP, rows.id);
          }
        });
      }
    });
    endConnection(socket, protocol, 200, '{"answer": "waiting for va"}');
  } else  if(json.getDevice) {
    // Client möchte die Kopplung mit dem VA bestätigen und brauch den Geräte-
    // Namen
    db.selectDeviceByName(json.device, function(row) {
      if(row == undefined) {
        endFlawedConnection(socket, protocol, "Dieser PC Client ist nicht registriert.", "not reqistered");
        return;
      } else {
        db.selectDeviceByKeyID(row.key_id, function(rows) {
          for(var i = 0; i < rows.length; i++) {
            if(rows[i].name != json.device) {
              // Ein registrierter VA mit selber Key ID
              var split = helper.splitDeviceName(rows[i].name)
              session.vaName = split;
              session.vaIP = rows[i].ip_address;
              logger.logInfo("Client fordert Informationen über Voice Assistent an.");
              logger.logInfo("VA: " + session.vaName + "(" + session.vaIP + ").");
              endConnection(socket, protocol, 200, '{"answer": "' + session.vaName + '"}');
              return;
            }
          }
          logger.logInfo("Client möchte sich mit VA verbinden. Doch es gibt bisher keinen registrierten VA.");
          endConnection(socket, protocol, 200, '{"answer": "waiting for va"}');
        }); // Ende selectDeviceByKeyID
      }
    }); // Ende selectDeviceByName
  } else if(json.koppeln == "true") {
    // Client möchte sich mit dem bekannten VA koppeln.
    db.selectDeviceByName(json.device, function(rows) {
      if(rows == undefined) {
        endFlawedConnection(socket, protocol, "Dieser PC Client ist nicht registriert.", "not reqistered");
        return;
      } else {
        logger.logInfo("Client möchte Kopplung mit " + session.vaName + "(" + session.vaIP + ").");
        endConnection(socket, protocol, 200, '{"answer": "coupling done"}');
      }
    });
  } else if (json.koppeln == "false") {
    // Client möchte sich mit dem bekannten VA nicht koppeln.
    session = new Session(null, null, null, false, null);
    logger.logInfo("Client möchte keine Kopplung. Session wird zurückgesetzt.");
    db.selectDeviceByName(json.device, function(row) {
      if(row == undefined) {
        endFlawedConnection(socket, protocol, "Dieser PC Client ist nicht registriert.", "not reqistered");
        return;
      } else {
        // Alle Devices mit der Key ID suchen und entfernen
        db.selectDeviceByKeyID(row.key_id, function(rows) {
          for(var i = 0; i < rows.length; i++) {
            db.deleteDeviceByName(rows[i].name);
          }
        });
      }
    });
    setTimeout(function() {db.deleteKeyByCodeword(session.codewords);}, 1000);
  	endConnection(socket, protocol, 200, '{"answer": "no coupling. session reset."}');
  } else {
    endFlawedConnection(socket, protocol, "Unerwartete Anfrage vom Client.", "unexpected request");
  }
}


/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(json, socket, protocol) {
	logger.logInfo(json.device + " hat sich verbunden!");
	session.vaIP = helper.getIP(socket.remoteAddress);
  session.vaName = json.device;
  session.vaUniqueName = helper.buildDeviceName(json.device, json.deviceID);
	if(json.koppeln != undefined) {
		logger.logInfo(session.vaName + " möchte sich mit einem Client verbinden.");
		var vaCodewords = json.koppeln.word1 + " " + json.koppeln.word2;
    // Key vorhaden?
    db.selectKeyByCodeword(vaCodewords, function(rows) {
      if(rows != undefined) {
        // Key ist vorhanden! PCClient mit dem key vorhanden?
        var keyID = rows.id;
        db.selectDeviceByKeyID(keyID, function(rows2) {
          for(var i = 0; i < rows2.length; i++) {
            if(rows2[i].name == "pcclient") {
              // PClient und Key in der DB
              logger.logInfo("Verbindung zwischen Client (" + session.clientIP
                    + ") und VA(" + session.vaIP + ") erstellt.");
              // Neuen VA in Datenbank sichern.
              if(!db.insertNewDevice(session.vaUniqueName, session.vaIP, keyID)) {
                db.updateDeviceByName(session.vaUniqueName, session.vaIP, keyID);
              }
              endAlexaConnection(socket, "Mit Client gekoppelt.");
              return;
            }
          }
          endAlexaConnection(socket, "Falsche Codewörter, es findet keine Kopplung statt.");
        });
      } else {
        endAlexaConnection(socket, "Client möchte bisher keine Kopplung herstellen.");
      }
    });
	} else {
    session.vaIP = null;
    session.vaName = null;
		endAlexaConnection(socket, "Unerwartete Anfrage.");
  }
}

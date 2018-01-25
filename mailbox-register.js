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
  this.readyToPair = readyToPair;
  this.codewords = codewords;
}


/* *** Globale Zustandsvariablen *** */
var ipArr = new Array();
var session = new Session(null, null, null, false, null);


/* *** Server initialisieren *** */
const port = 51337; // Registriere Port
const server = net.createServer(); // Neue Server Instanz.

logger.logInfo("Server starten. Port: " + port);
server.listen(port); // Server Port öffnen.
server.on('connection', clientConnectedEvent); // Event bei 'connection'
server.on('error', errorEvent); // Event bei 'error'
logger.setServer("register"); // Dem Logger den Namen des Servers übermitteln.
db.initDatabase(); // Datenbank initialisieren


/* ************************* SERVER-FUNKTIONEN ****************************** */


/* clientConnectedEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function clientConnectedEvent(sock) {
	logger.spacer();
	logger.logInfo("Neue Verbindung von: " + helper.getIP(sock.remoteAddress));

	sock.on('data', function(data) {
		logger.logInfo("Daten vom Client erhalten.");

		// Request aufteilen in Header, verwendetes Protokoll und Daten.
		var request = helper.splitRequest(data);

		if(request.data == null) {
      sock.write('{"ERROR": "no json"}');
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
	if(helper.registerIP(ipArr, socket.remoteAddress)) {
		// Eine neue IP wurde registriert. Der Client möchte sich mit einem Voice
		// Assistent verbinden.
    if(json.password == undefined) {
      // Kein 'passwords'
      session = new Session(null, null, null, false, null);
      logger.logInfo("Neuer Client schickte keine Codewörter.");
      helper.unregisterIP(ipArr, socket.remoteAddress);
    } else {
      // Codewörter bekommen
		  session.clientIP = helper.getLastRegisteredIP(ipArr);
		  session.codewords = json.password;
		  session.isReadyToPair = true;
		  logger.logInfo("Client möchte sich mit VA verbinden. Codewörter: " + session.codewords);
      // Neuen Client und Schlüssel in Datenbank sichern.
      db.selectKeyByCodeword(session.codewords, function(rows) {
        if(rows == undefined) {
          // Key noch nicht vorhanden
          db.insertNewKey(session.codewords, function(lastID) {
            db.selectDeviceByName(json.device, function(row) {
              if(row == undefined) {
                db.insertNewDevice(json.device, session.clientIP, lastID);
              } else {
                db.updateDeviceByName(json.device, session.clientIP, lastID);
              }
            });
          });
        } else {
          // Alter Eintrag, Ablaufdatum aktualisieren.
          db.updateKeyByCodeword(session.codewords);
          db.selectDeviceByName(json.device, function(row) {
            if(row == undefined) {
              db.insertNewDevice(json.device, session.clientIP, rows.id);
            } else {
              db.updateDeviceByName(json.device, session.clientIP, rows.id);
            }
          });
        }
      });
      endConnection(socket, protocol, 200, '{"answer": "WAITING FOR VA"}');
    }
	} else {
    // Die IP ist bereits bekannt.
    if(json.getDevice) {
      // Client möchte die Kopplung mit dem VA bestätigen und brauch den Geräte-
      // Namen
      if(session.vaName == null) {
        logger.logInfo("Client möchte sich mit VA verbinden. Doch es gibt bisher keinen registrierten VA.");
    		endConnection(socket, protocol, 200, '{"answer": "WAITING FOR VA"}');
      } else {
        logger.logInfo("Client fordert Informationen über Voice Assistent an.");
        logger.logInfo("VA: " + session.vaName + "(" + session.vaIP + ").");
        endConnection(socket, protocol, 200, '{"answer": "' + session.vaName + '"}');
      }
    } else if(json.koppeln == "true") {
      // Client möchte sich mit dem bekannten VA koppeln.
      logger.logInfo("Client möchte Kopplung mit " + session.vaName + "(" + session.vaIP + ").");
      endConnection(socket, protocol, 200, '{"answer": "COUPLING DONE."}');
    } else if (json.koppeln == "false") {
      // Client möchte sich mit dem bekannten VA nicht koppeln.
      helper.unregisterIP(ipArr, session.clientIP);
      session = new Session(null, null, null, false, null);
      logger.logInfo("Client möchte keine Kopplung. Session wird zurückgesetzt.");
      db.deleteDeviceByName(json.device);
      db.deleteKeyByCodeword(session.codewords);
  		endConnection(socket, protocol, 200, '{"answer": "NO COUPLING. SESSION RESET."}');
    } else {
      endFlawedConnection(socket, protocol, "Unerwartete Anfrage vom Client.", "unexpected request");
    }
  }
}


/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(json, socket, protocol) {
	logger.logInfo(json.device + " hat sich verbunden!");
	session.vaIP = helper.getIP(socket.remoteAddress);
  session.vaName = json.device;
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
              if(!db.insertNewDevice(json.device, session.vaIP, keyID)) {
                db.updateDeviceByName(json.device, session.vaIP, keyID);
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

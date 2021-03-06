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
const port = 61337; // Registriere Port
const server = net.createServer(); // Neue Server Instanz.

server.listen(port); // Server Port öffnen.
server.on('connection', clientConnectedEvent); // Event bei 'connection'
server.on('error', errorEvent); // Event bei 'error'
logger.setServer("google"); // Dem Logger den Namen des Servers übermitteln.
logger.logInfo("Server gestartet. Port: " + port);
db.initDatabase(); // Datenbank initialisieren


/* ************************* SERVER-FUNKTIONEN ****************************** */


/* clientConnectedEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function clientConnectedEvent(sock) {
  logger.setServer("google"); // Diese Variable wurde mittlerweile eventuell überschrieben
	logger.spacer();
	logger.logInfo("Neue Verbindung von: " + helper.getIP(sock.remoteAddress));

	sock.on('data', function(data) {
		logger.logInfo("Daten vom Client erhalten.");

		// Request aufteilen in Header, verwendetes Protokoll und Daten.
		var request = helper.splitRequest(data);

		if(request.data == null) {
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


/* endGoogleConnection
 * Beendet eine Google Verbindung. Hierbei muss die zurück gesendete JSON-Datei
 * ein bestimmtes Format vorweisen.
 */
function endGoogleConnection(socket, message) {
	logger.logInfo(message);
	endConnection(socket, "http", 200, '{"speech": "' + message + '","displayText": "' + message + '"}');
}


/* checkDevice
 * Überprüft welches Gerät die Anfrage gesendet hat.
 */
function checkDevice(json, socket, protocol) {
	logger.logInfo("Prüfe welches Gerät verwendet wird.");

	if(json.result != undefined) {
		// Google bietet keine Möglichkeit die JSON-Datei anzupassen.
    // result Attribut ist immer enthalten.
		handleGoogleRequest(json, socket, protocol);
	} else {
		endFlawedConnection(socket, protocol, "Unbekanntes Gerät.", "unknown device");
	}
}


/* handleGoogleRequest
 * Behandelt Anfragen des Google VAs.
 */
function handleGoogleRequest(json, socket, protocol) {
	logger.logInfo("Google Home hat sich verbunden!");
	session.vaIP = helper.getIP(socket.remoteAddress);
  session.vaName = "Google Home";
	if("Koppeln" == json.result.metadata.intentName) {
		logger.logInfo("Google Home möchte sich mit einem Client verbinden.");
		var vaCodewords = json.result.parameters.codewords;
    vaCodewords = vaCodewords.toLowerCase();

    // Key vorhaden?
    db.selectKeyByCodeword(vaCodewords, function(rows) {
      if(rows != undefined) {
        // Key ist vorhanden! PCClient mit dem key vorhanden?
        var keyID = rows.id;
        db.selectDeviceByKeyID(keyID, function(rows2) {
          for(var i = 0; i < rows2.length; i++) {
            if(rows2[i].name.match(/^pcclient.*$/)) {
              // PClient und Key in der DB
              logger.logInfo("Verbindung zwischen Client (" + rows2[i].ip_address + ") und VA(" + session.vaIP + ") erstellt.");
              // Neuen VA in Datenbank sichern.
              if(!db.insertNewDevice(session.vaName, session.vaIP, keyID)) {
                db.updateDeviceByName(session.vaName, session.vaIP, keyID);
              }
              endGoogleConnection(socket, "Mit Client gekoppelt.");
              return;
            }
          }
          endGoogleConnection(socket, "Falsche Codewörter, es findet keine Kopplung statt.");
        });
      } else {
        endGoogleConnection(socket, "Client möchte bisher keine Kopplung herstellen oder Codewords sind falsch.");
      }
    });

	} else if("Entkoppeln" == json.result.metadata.intentName) {
		session.vaIP = null;
    session.vaName = null;
		logger.logInfo("Verbindung zwischen Client (" + getLastRegisteredIP() + ") und VA(" + session.vaIP + ") gelöscht.");
    db.deleteDeviceByName(session.vaName);
    endGoogleConnection(socket, "Kopplung mit Client aufgehoben.");
	} else if("Programm starten" == json.result.metadata.intentName) {
    db.selectDeviceByName(session.vaName, function(row) {
      if(row != undefined) {
        // Dieses Google Home Gerät ist bereits gekoppelt
        db.selectDeviceByKeyID(row.key_id, function(rows) {
          for(var i = 0; i < rows.length; i++) {
            if(rows[i].name.match(/^pcclient.*$/)) {
              // Es gibt einen PC Client mit der selben Key ID, also wurde
              // Die Kopplung bereits bestätigt.
              var instruction = json.result.parameters.program;
              logger.logInfo("Programm zum starten: " + instruction);
              fh.writeFile("Google Home" + ";" + instruction + "|" + "Starten" );
              endGoogleConnection(socket, "Gebe den Befehl weiter.");
              return;
            }
          }
        });
        return;
      }
      endGoogleConnection(socket, "Dieser Voice Assistent ist bisher nicht gekoppelt.");
    });
  } else if("Programm Befehl" == json.result.metadata.intentName) {
    db.selectDeviceByName(session.vaName, function(row) {
      if(row != undefined) {
        // Dieses Google Home Gerät ist bereits gekoppelt
        db.selectDeviceByKeyID(row.key_id, function(rows) {
          for(var i = 0; i < rows.length; i++) {
            if(rows[i].name.match(/^pcclient.*$/)) {
              // Es gibt einen PC Client mit der selben Key ID, also wurde
              // Die Kopplung bereits bestätigt.
              var instruction = json.result.parameters.program;
              var task = json.result.parameters.task;
              logger.logInfo("Task " + task + " für Programm: " + instruction);
              fh.writeFile("Google Home" + ";" + instruction + "|" + task);
              endGoogleConnection(socket, "Gebe den Befehl weiter.");
              return;
            }
          }
        });
        return;
      }
      endGoogleConnection(socket, "Dieser Voice Assistent ist bisher nicht gekoppelt.");
    });
  } else {
    session.vaIP = null;
    session.vaName = null;
		endGoogleConnection(socket, "Unerwartete Anfrage.");
  }
}

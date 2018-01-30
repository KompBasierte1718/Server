/* Datei: mailbox.js
 * Der Befehls-Server, auf Port 41337.
 * Es wird eine JSON Anfrage erwartet.
 * Befehle der Clients werden hier an den Client weitergegeben.
 * Sind die Engeräte nicht registriert, werden sie abgewiesen.
 *
 * Autor: Daniel Nagel
 * Seit:  10.01.2018
 */

 // Referenzen einbinden.
const net = require('net');
const parseJSON = require('json-parse-async');
const logger = require('./mailbox-logger');
const helper = require('./mailbox-helper');
const db = require('./mailbox-db');
const fh = require('./mailbox-filehandler');


/* *** Globale Variablen *** */
var instruction = null;

/* *** Server initialisieren *** */
const port = 41337; // Registriere Port
const server = net.createServer(); // Neue Server Instanz.

server.listen(port); // Server Port öffnen.
server.on('error', errorEvent); // Event bei 'error'
server.on('connection', clientConnectedEvent); // Event bei 'connection'
logger.setServer("commands"); // Dem Logger den Namen des Servers übermitteln.

logger.logInfo("Server gestartet. Port: " + port);
db.initDatabase(); // Datenbank initialisieren


/* ************************* SERVER-FUNKTIONEN ****************************** */


/* clientConnectedEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function clientConnectedEvent(sock) {
	logger.setServer("commands"); // Diese Variable wurde mittlerweile eventuell überschrieben
	logger.spacer();
	logger.logInfo("Neue Verbindung von: " + helper.getIP(sock.remoteAddress));

	sock.on('data', function(data) {
		logger.logInfo("Daten vom Client erhalten.");

		// Request validieren
		var request = helper.splitRequest(data);

		if(request.data == null) {
			//endFlawedConnection(sock, request.protocol, "Keine Daten, Verbindung wird geschloßen!", "no json");
		} else {
			parseJSON(request.data, function(error, json) {
				if(error) {
					endFlawedConnection(sock, request.protocol,
									"JSON konnte nicht geparst werden. Inhalt: " + data
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
	var uniqueDevice = helper.buildDeviceName(json.device, json.deviceID);
	if(json.instructions) {
		db.selectDeviceByName(uniqueDevice, function(row) {
			if(row == undefined) {
				endFlawedConnection(socket, protocol, "Dieser PC Client ist nicht registriert.", "not reqistered");
			} else {
				// Hier werden Befehle an den Anfrageneden Client gesendet!
				var dataFromFile = fh.readFile();
				if(dataFromFile.length < 1) {
					endFlawedConnection(socket, protocol, "Keine neuen Befehle vorhanden!", "no commands");
				} else {
					dataFromFile = helper.splitInstruction(dataFromFile);
					var deviceName = dataFromFile[0];
					var instruction = dataFromFile[1];
					var task = dataFromFile[2];
					if(task == "undefined") {
						task = "Starte";
					}
					db.selectDeviceByKeyID(row.key_id, function(rows) {
						for(var i = 0; i < rows.length; i++) {
							if(rows[i].name == deviceName) {
								if(instruction) {
									// Der Befehl wird abgeschickt und deswegen gelöscht.
									fh.writeFile("");
									logger.logInfo("Sende neuen Befehl '" + instruction + "' an PC Client");
									endConnection(socket, protocol, 200, '{"answer": "new commands", "program": "' + instruction + '", "task": "' + task + '"}');
									return;
								}
							}
						}
						endFlawedConnection(socket, protocol, "Bisher kein VA registriert.", "va has no commands");
					});
				}
			}
		});
	} else {
		endFlawedConnection(socket, protocol, "Unerwartete Anfrage vom Client.", "unexpected request");
	}
}


/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(json, socket, protocol) {
	logger.logInfo("Ein Alexa Gerät hat sich verbunden!");
	if(json.instruction) {
		var uniqueDevice = helper.buildDeviceName(json.device, json.deviceID);
		db.selectDeviceByName(uniqueDevice, function(row) {
			if(row != undefined) {
				// Dieses Alexa Gerät ist bereits gekoppelt
				db.selectDeviceByKeyID(row.key_id, function(rows) {
					for(var i = 0; i < rows.length; i++) {
						if(rows[i].name.match(/.*pcclient.*/i)) {
							// Es gibt einen PC Client mit der selben Key ID, also wurde
							// Die Kopplung bereits bestätigt.
							logger.logInfo("Neuer Befehl: " + json.instruction);
							fh.writeFile(uniqueDevice + ";" + json.instruction + "|" + json.task);
							endAlexaConnection(socket, "Gebe den Befehl weiter.");
							return;
						}
					}
				});
				return;
			}
			endAlexaConnection(socket, "Dieser Voice Assistent ist bisher nicht gekoppelt.");
		});
	}
}

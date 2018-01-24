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
db.initDatabase(); // Datenbank initialisieren

logger.logInfo("Server gestartet. Port: " + port);


/* ************************* SERVER-FUNKTIONEN ****************************** */


/* clientConnectedEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function clientConnectedEvent(sock) {
	logger.spacer();
	logger.logInfo("Neue Verbindung von: " + helper.getIP(sock.remoteAddress));

	sock.on('data', function(data) {
		logger.logInfo("Daten vom Client erhalten.");

		// Request validieren
		var request = helper.splitRequest(data);

		if(request.data == null) {
			endFlawedConnection(sock, request.protocol, "Keine Daten, Verbindung wird geschloßen!", "no json");
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
	if(json.instructions) {
				// Hier werden Befehle an den Anfrageneden Client gesendet!
				var instruction = fh.readFile();
				if(instruction.length > 1) {
					// Der Befehl wird abgeschickt und deswegen gelöscht.
					fh.writeFile("");
					logger.logInfo("Sende neuen Befehl '" + instruction + "' an PC Client");
					endConnection(socket, protocol, 200, '{"answer": "NEW COMMAND", "program": "' + instruction + '"}');
				} else {
					logger.logInfo("Keine neuen Befehle vorhanden!");
					endConnection(socket, protocol, 400, '{"answer": "NO COMMANDS"}');
				}
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
			instruction = json.instruction
			logger.logInfo("Neuer Befehl: " + instruction);
			fh.writeFile(instruction);
			endAlexaConnection(socket, "Gebe den Befehl weiter.");
	}
}

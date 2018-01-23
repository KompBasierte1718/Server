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


/* *** Globale Variablen *** */
var instruction = null;

/* *** Server initialisieren *** */
const port = 41337; // Registriere Port
const server = net.createServer(); // Neue Server Instanz.

server.listen(port); // Server Port öffnen.
server.on('connection', clientConnectedEvent); // Event bei 'connection'
logger.setServer("commands"); // Dem Logger den Namen des Servers übermitteln.

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
			parseJSON(request.data, function(err, content) {
				if(err) {
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
		logger.spacer();
	}); // ENDE socket 'end'
}

/* endConnection
 * Beendet die Verbindung zu einem Gerät.
 */
function endConnection(socket, isHttp, httpHeader, data) {
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
			if(json.result != undefined) {
				// Google bietet keine Möglichkeit die JSON-Datei anzupassen.
				handleGoogleRequest(json, socket, protocol);
			} else {
				endFlawedConnection(socket, protocol, "Unbekanntes Gerät.", "unknown device");
			}
	}
}


/* handleClientRequest
 * Behandelt Anfragen des Clients.
 */
function handleClientRequest(json, socket, protocol) {
	logger.logInfo("Ein PC Client hat sich verbunden!");
	if(content.instructions) {
				// Hier werden Befehle an den Anfrageneden Client gesendet!
				if(instruction != null) {
					// Der Befehl wird abgeschickt und deswegen gelöscht.
					var tempInstruction = instruction;
					instruction = null;
					logger.logInfo("Sende neuen Befehl '" + tempInstruction + "' an PC Client");
					endConnection(socket, protocol, 200, '{"answer": "NEW COMMAND", "program": "' + tempInstruction + '"}');
				} else {
					logger.logInfo("Keine neuen Befehle vorhanden!");
					endConnection(socket, protocol, 400, '{"answer": "NO COMMANDS"}');
				}
		} else {
			endFlawedConnection(socket, protocol, "Unerwartete Anfrage vom Client.", "unexpected request");
		}
}


/* handleGoogleRequest
 * Behandelt Anfragen des Google VAs.
 */
function handleGoogleRequest(json, socket, protocol) {
	logger.logInfo("Ein Google Gerät hat sich verbunden!");
	if(content.result.metadata.intentName == "Programm starten") {
		instruction = content.result.parameters.program;
		logger.logInfo("Neuer Befehl: " + instruction);
		endGoogleConnection(socket, "Gebe den Befehl weiter.");
	}
}

/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(json, socket, protocol) {
	logger.logInfo("Ein Alexa Gerät hat sich verbunden!");
	if(content.instruction) {
			instruction = content.instruction
			logger.logInfo("Neuer Befehl: " + instruction);
			endAlexaConnection(socket, "Gebe den Befehl weiter.");
	}
}

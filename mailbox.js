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
const logger = require('./logger');
const helper = require('./mailbox-helper');


/* *** Globale Variablen *** */
var instruction = null;

/* *** Server initialisieren *** */
const port = 41337; // Registriere Port
const server = net.createServer(); // Neue Server Instanz.

server.listen(port); // Server Port öffnen.
server.on('connection', clientConnectedEvent); // Event bei 'connection'
logger.setServer("commands"); // Dem Logger den Namen des Servers übermitteln.

console.log("Befehls-Server gestartet. Port: " + port); //DEBUG
logger.logInfo("Befehls-Server gestartet. Port: " + port);


/* ************************* SERVER-FUNKTIONEN ****************************** */


/* clientConnectedEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function clientConnectedEvent(sock) {
	console.log("\n####################################################"); //DEBUG
	console.log("Neue Verbindung von: " + helper.getIP(sock.remoteAddress)); //DEBUG
	logger.spacer();
	logger.logInfo("Neue Verbindung von: " + helper.getIP(sock.remoteAddress));

	sock.on('data', function(data) {
		console.log("Daten vom Client erhalten."); //DEBUG
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
					console.log("JSON-Datei erforlgreich geparst."); //DEBUG
					logger.logInfo("JSON-Datei erforlgreich geparst.");
					checkDevice(json, sock, request.protocol);
				}
			}); // Ende parseJSON
		}
	}); // ENDE socket 'connection'

	// Client möchte die Verbindung beenden.
	sock.on('end', function() {
		console.log("Client bestätigt das Ende der Verbindung."); // DEBUG
		logger.logInfo("Client bestätigt das Ende der Verbindung.");
		sock.end();
		logger.spacer();
		console.log("####################################################\n"); //DEBUG
	}); // ENDE socket 'end'
}

/* endConnection
 * Beendet die Verbindung zu einem Gerät.
 */
function endConnection(socket, isHttp, httpHeader, data) {
	console.log("Verbindung wird geschloßen!"); //DEBUG
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
	console.error(errLog); //DEBUG
	logger.logError('connection', errLog);
	endConnection(socket, protocol, 400, '{"error": "' + errJSON + '"}');
}


/* endGoogleConnection
 * Beendet eine Google Verbindung. Hierbei muss die zurück gesendete JSON-Datei
 * ein bestimmtes Format vorweisen.
 */
function endGoogleConnection(socket, message) {
	console.log(message); //DEBUG
	logger.logInfo(message);
	endConnection(socket, "http", 200, '{"speech": "' + message + '","displayText": "' + message + '"}');
}


/* endAlexaConnection
 * Beendet eine Alexa verbindung.
 */
function endAlexaConnection(socket, message) {
	console.log(message); //DEBUG
	logger.logInfo(message);
	endConnection(socket, "http", 200, '{"answer": "' + message + '"}');
}


/* checkDevice
 * Überprüft welches Gerät die Anfrage gesendet hat.
 */
function checkDevice(json, socket, protocol) {
	console.log("Prüfe welches Gerät verwendet wird."); //DEBUG
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
	console.log("Gerät: PC Client"); //DEBUG
	if(content.instructions) {
				// Hier werden Befehle an den Anfrageneden Client gesendet!
				if(instruction != null) {
					// Der Befehl wird abgeschickt und deswegen gelöscht.
					var tempInstruction = instruction;
					instruction = null;
					logger.logInfo("Sende neuen Befehl '" + tempInstruction + "' an PC Client");
					console.log("Sende neuen Befehl '" + tempInstruction + "' an PC Client"); //DEBUG
					endConnection(socket, protocol, 200, '{"answer": "NEW COMMAND", "program": "' + tempInstruction + '"}');
				} else {
					logger.logInfo("Keine neuen Befehle vorhanden!");
					console.log("Keine neuen Befehle vorhanden!"); //DEBUG
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
	console.log("Gerät: Google Home"); //DEBUG
	if(content.result.metadata.intentName == "Programm starten") {
		instruction = content.result.parameters.program;
		logger.logInfo("Neuer Befehl: " + instruction);
		console.log("Neuer Befehl: " + instruction); //DEBUG
		endGoogleConnection(socket, "Gebe den Befehl weiter.");
	}
}

/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(json, socket, protocol) {
	logger.logInfo("Ein Alexa Gerät hat sich verbunden!");
	console.log("Gerät: Alexa"); //DEBUG
	if(content.instruction) {
			instruction = content.instruction
			logger.logInfo("Neuer Befehl: " + instruction);
			console.log("Neuer Befehl: " + instruction); //DEBUG
			endAlexaConnection(socket, "Gebe den Befehl weiter.");
	}
}

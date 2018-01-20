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
const logger = require('./logger');
const helper = require('./mailbox-helper');


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

server.listen(port); // Server Port öffnen.
server.on('connection', clientConnectedEvent); // Event bei 'connection'
server.on('error', errorEvent); // Event bei 'error'
logger.setServer("register"); // Dem Logger den Namen des Servers übermitteln.

logger.logInfo("Registrierungs-Server gestartet. Port: " + port);
console.log("Registrierungs-Server gestartet. Port: " + port); //DEBUG


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

		// Request aufteilen in Header, verwendetes Protokoll und Daten.
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

  // Fehler bei der Verbindung
  sock.on('error', function() { //DEBUG
    console.log("Fehler bei der Verbindung"); //DEBUG
  });

  // Schließen der Verbindung nach Fehler
  sock.on('close', function() {
    console.log("Verbindung wird wegen 'close' Event geschloßen."); // DEBUG
		logger.logInfo("Verbindung wird wegen 'close' Event geschloßen.");
		sock.end();
		logger.spacer();
		console.log("####################################################\n"); //DEBUG
  });
}


/* errorEvent
 * Behandelt auftretende Fehler.
 */
function errorEvent(error) { //DEBUG
  console.error("Ein Fehler ist aufgetreten: " + error); //DEBUG
  logger.logError("connection", "Ein Fehler ist aufgetreten: " + error);
  server.close();
  throw error;
}

/* endConnection
 * Beendet die Verbindung zu einem Gerät.
 */
function endConnection(socket, protocol, status, message) {
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
	// TEST ob endConnection möglich ist statt write.
	logger.logInfo("Ein PC Client hat sich verbunden!");
	console.log("Gerät: PC Client"); //DEBUG
	if(helper.registerIP(ipArr, socket.remoteAddress)) {
		// Eine neue IP wurde registriert. Der Client möchte sich mit einem Voice
		// Assistent verbinden.
		session.clientIP = helper.getLastRegisteredIP(ipArr);
		session.codewords = json.password;
		session.isReadyToPair = true;
		logger.logInfo("Client möchte sich mit VA verbinden. Codewörter: " + session.codewords);
		console.log("Client möchte sich mit VA verbinden. Codewörter: " + session.codewords); //DEBUG
		// socket.write('{"answer": "WAITING FOR VA"}'); // TEST
		endConnection(socket, protocol, 200, '{"answer": "WAITING FOR VA"}'); // TEST
	} else {
    // Die IP ist bereits bekannt.
    if(json.getDevice) {
      // Client möchte die Kopplung mit dem VA bestätigen und brauch den Geräte-
      // Namen
      logger.logInfo("Client fordert Informationen über Voice Assistent an.");
      logger.logInfo("VA: " + session.vaName + "(" + session.vaIP + ").");
      console.log("Client fordert Informationen über Voice Assistent an."); //DEBUG
      // socket.write('{"answer": "COUPLING DONE."}'); // TEST
      endConnection(socket, protocol, 200, '{"answer": "DEVICE:' + session.vaName + '"}'); // TEST
    } else if(json.koppeln == "true") {
      // Client möchte sich mit dem bekannten VA koppeln.
      logger.logInfo("Client möchte Kopplung mit " + session.vaName + "(" + session.vaIP + ").");
      console.log("Client möchte Kopplung mit " + session.vaName + "(" + session.vaIP + ")."); //DEBUG
  		// socket.write('{"answer": "COUPLING DONE."}'); // TEST
  		endConnection(socket, protocol, 200, '{"answer": "COUPLING DONE."}'); // TEST
    } else if (json.koppeln == "false") {
      // Client möchte sich mit dem bekannten VA nicht koppeln.
      session = new Session(null, null, null, false, null);
      logger.logInfo("Client möchte keine Kopplung. Session wird zurückgesetzt.");
      console.log("Client möchte keine Kopplung. Session wird zurückgesetzt."); //DEBUG
  		// socket.write('{"answer": "NO COUPLING. SESSION RESET."}'); // TEST
  		endConnection(socket, protocol, 200, '{"answer": "NO COUPLING. SESSION RESET."}'); // TEST
    } else {
      endFlawedConnection(socket, protocol, "Unerwartete Anfrage vom Client.", "unexpected request");
    }
  }
}


/* handleGoogleRequest
 * Behandelt Anfragen des Google VAs.
 */
function handleGoogleRequest(json, socket, protocol) {
	logger.logInfo("Google Home hat sich verbunden!");
	console.log("Gerät: Google Home"); //DEBUG
	session.vaIP = getIP(socket.remoteAddress);
  session.vaName = "Google Home";
	if("Koppeln" == json.result.metadata.intentName) {
		logger.logInfo("Google Home möchte sich mit einem Client verbinden.");
		console.log("Google Home möchte sich mit einem Client verbinden."); //DEBUG
		var vaCodewords = json.result.parameters.codewords;
		if(!session.isReadyToPair) {
			endGoogleConnection(socket, "Client möchte bisher keine Kopplung herstellen.");
	  } else if(session.codewords == vaCodewords) {
			console.log("Verbindung zwischen Client (" + session.clientIP + ") und VA(" + session.vaIP + ") erstellt."); //DEBUG
			logger.logInfo("Verbindung zwischen Client (" + session.clientIP + ") und VA(" + session.vaIP + ") erstellt.");
			endGoogleConnection(socket, "Mit Client gekoppelt.");
		} else if(session.codewords != vaCodewords) {
			endGoogleConnection(socket, "Falsche Codewörter, es findet keine Kopplung statt.");
		}
	} else if("Entkoppeln" == json.result.metadata.intentName) {
		session.vaIP = null;
    session.vaName = null;
		console.log("Verbindung zwischen Client (" + getLastRegisteredIP() + ") und VA(" + session.vaIP + ") gelöscht.");
		logger.logInfo("Verbindung zwischen Client (" + getLastRegisteredIP() + ") und VA(" + session.vaIP + ") gelöscht.");
		endGoogleConnection(socket, "Kopplung mit Client aufgehoben.");
	} else {
    session.vaIP = null;
    session.vaName = null;
		endGoogleConnection(socket, "Unerwartete Anfrage.");
  }
}


/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(json, socket, protocol) {
	logger.logInfo("Alexa hat sich verbunden!");
	console.log("Gerät: Alexa"); //DEBUG
	session.vaIP = getIP(socket.remoteAddress);
  session.vaName = "Alexa";
	if(json.koppeln != undefined) {
		logger.logInfo("Alexa möchte sich mit einem Client verbinden.");
		console.log("Alexa möchte sich mit einem Client verbinden."); //DEBUG
		var vaCodewords = json.koppeln.word1 + " " + json.koppeln.word2;
		if(!session.isReadyToPair) {
			endAlexaConnection(socket, "Client möchte bisher keine Kopplung herstellen.");
		} else if(session.codewords == vaCodewords) {
			console.log("Verbindung zwischen Client (" + session.clientIP + ") und VA(" + session.vaIP + ") erstellt."); //DEBUG
			logger.logInfo("Verbindung zwischen Client (" + session.clientIP + ") und VA(" + session.vaIP + ") erstellt.");
			endAlexaConnection(socket, "Mit Client gekoppelt.");
		} else if(session.codewords != vaCodewords) {
			endAlexaConnection(socket, "Falsche Codewörter, es findet keine Kopplung statt.");
		}
	} else {
    session.vaIP = null;
    session.vaName = null;
		endAlexaConnection(socket, "Unerwartete Anfrage.");
  }
}

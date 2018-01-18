const net = require('net');
var parseJSON = require('json-parse-async');
var logger = require('./logger');
var helper = require('./mailbox-helper');


/* *** Globale Zustandsvariablen *** */
var isReadyToPair = false;
var codewords = null;
var knownIPs = new Array();
var session = null;
var befehl = null;

/* *** Starte Server *** */
const PORT = 51337;
var server = net.createServer(); // Neue Server Instanz.
server.listen(PORT); // Server Port öffnen.
server.on('connection', onClientConnected_ServerEvent); // Event bei 'connection'
logger.logInfo("Registrierungs Server gestartet.");
console.log("Listening on port " + PORT); //DEBUG


/* ************************* SERVER-FUNKTIONEN ****************************** */

/* onClientConnected_ServerEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function onClientConnected_ServerEvent(sock) {
	console.log("\n####################################################"); //DEBUG
	console.log("Neue Registrierung von: " + getIP(sock.remoteAddress)); //DEBUG
	logger.logInfo("Neue Registrierung von: " + getIP(sock.remoteAddress));

	sock.on('data', function(data) { // Daten vom Client
		// Request validieren
		var requestArr = splitRequest(data);
		var isHttp = isHTTPHeader(requestArr[0]);
		var isParsable = isParsableRequest(requestArr[1]);

		if(!isParsable) {
			console.log("Verbindung geschloßen!"); //DEBUG
			logger.logInfo("Verbindung mit " + sock.remoteAddress + " geschloßen.");
			endConnection(sock, isHttp, headers.get(400), '{"answer": "ERROR: NO JSON"}');
		} else {
			parseJSON(requestArr[1], function(err, content) {
				if(err) {
					console.error("\nKann JSON-Datei nicht parsen!"); //DEBUG
					console.error("Inhalt: " + data); //DEBUG
					console.error("Fehler: " + err + "\n"); //DEBUG
					logger.logError("onClientConnected_ServerEvent",
												"JSON konnte nicht geparst werden.");
					endConnection(sock, isHttp, headers.get(400), '{"speach": "JSON NOT PARSABLE"}');
				} else {
					// JSON-Datei erforlgreich geparst.
					console.log("\nJSON-Datei erforlgreich geparst."); //DEBUG

					switch(content.device) {
						case "pcclient":
							handleClientRequest(content, sock, isHttp, headers);
							break;
						case "alexa":
							handleAlexaRequest(content, sock, isHttp, headers);
							break;
						default:
							if(content.result != undefined) {
								handleGoogleRequest(content, sock, isHttp, headers);
								break;
							} else {
								console.error("Gerät: Unbekannt"); //DEBUG
								logger.logError("onClientConnected_ServerEvent",
														"Unbekanntes Gerät.");
								endConnection(sock, isHttp, headers.get(400), '{"answer": "UNKNOWN DEVICE"}');
							}
					}
				}
			}); // Ende parseJSON
		}
	}); // ENDE socket 'connection'

	// Client möchte die Verbindung beenden.
	sock.on('end', function() {
		console.log("Client möchte Verbindung schließen!"); // DEBUG
		logger.logInfo("Verbindung auf Anfrage von " + getIP(sock.remoteAddress)
										+ " geschloßen.");
		sock.end();
		console.log("####################################################\n"); //DEBUG
	}); // ENDE socket 'end'
}

/* endConnection
 * Beendet die Verbindung zu einem Gerät.
 */
function endConnection(socket, isHttp, httpHeader, data) {
	if(isHttp){
		socket.end(httpHeader + data);
	} else {
		socket.end(data);
	}
}

/* handleClientRequest
 * Behandelt Anfragen des Clients.
 */
function handleClientRequest(content, sock, isHttp, headers, isRegistered) {
	// endConnection nicht möglich, daher wird beim client ausscließlich die
	// write() Methode genutzt.
	logger.logInfo("Ein PC Client hat sich verbunden!");
	console.log("Gerät: PC Client"); //DEBUG
	if(!isKnownDevice(sock.remoteAddress)) { // Instanziierung einer neuen Verbindung
		logger.logInfo("Neue Registrierung vom Client angefordert.");
		logger.logInfo("Passwort: " + content.password);
		console.log("Bereit zur Paarung!"); //DEBUG
		console.log("Passwort: " + content.password); //DEBUG
		codewords = content.password;
		isReadyToPair = true;
		sock.write('{"answer": "WAITING FOR VA"}');
		//endConnection(sock, isHttp, headers.get(200), '{"answer": "WAITING FOR VA"}');
	}
}

/* handleGoogleRequest
 * Behandelt Anfragen des Google VAs.
 */
function handleGoogleRequest(content, sock, isHttp, headers) {
	logger.logInfo("Ein Google Gerät hat sich verbunden!");
	console.log("Gerät: Google Home"); //DEBUG
	if(content.result.metadata.intentName == "Koppeln") {
		console.log("Anfrage: " + content.result.resolvedQuery); //DEBUG
		console.log("Codewords: " + content.result.parameters.codewords); //DEBUG
		logger.logInfo("Prüfe die Codewords " + content.result.parameters.codewords);
		if(codewords == content.result.parameters.codewords) {
			session = new Session(getLastRegisteredIP(), sock.remoteAddress);
			logger.logInfo("Verbindung zwischen Client (" + getLastRegisteredIP() + ") und VA(" + getIP(sock.remoteAddress) + ") erstellt.");
			endConnection(sock, isHttp, headers.get(200), '{"speech": "Mit Client Verbunden.","displayText": "Mit Client Verbunden."}');
		} else {
			logger.logInfo("VA hat falsche Codewörter übergeben.");
			console.log("VA hat falsche Codewörter übergeben.");
			endConnection(sock, isHttp, headers.get(200), '{"speech": "Falsche Codewörter.","displayText": "Falsche Codewörter."}');
		}
	} else if(content.result.metadata.intentName == "Entkoppeln") {
		session = null
		logger.logInfo("Verbindung zwischen Client (" + getLastRegisteredIP() + ") und VA(" + getIP(sock.remoteAddress) + ") gelöscht.");
		endConnection(sock, isHttp, headers.get(200), '{"speech": "Verbindung mit Client aufgehoben.","displayText": "Verbindung mit Client aufgehoben."}');
	}
}

/* handleAlexaRequest
 * Behandelt Anfragen des Alexa VAs.
 */
function handleAlexaRequest(content, sock, isHttp, headers) {
	logger.logInfo("Ein Alexa Gerät hat sich verbunden!");
	console.log("Gerät: Alexa"); //DEBUG
	if(content.koppeln) {
		console.log("Codewords: " + content.koppeln.word1 + " " + content.koppeln.word2); //DEBUG
		logger.logInfo("Prüfe die Codewords " + content.koppeln.word1 + " " + content.koppeln.word2);
		if(codewords == content.koppeln.word1 + " " + content.koppeln.word2) {
			session = new Session(getLastRegisteredIP(), sock.remoteAddress);
			logger.logInfo("Verbindung zwischen Client (" + getLastRegisteredIP() + ") und VA(" + getIP(sock.remoteAddress) + ") erstellt.");
			endConnection(sock, isHttp, headers.get(200), '{"answer": "CONNECTED"}');
		} else {
			logger.logInfo("VA hat falsche Codewörter übergeben.");
			endConnection(sock, isHttp, headers.get(400), '{"answer": "WRONG CODEWORDS"}');
		}
	}
}

function Session(clientIP, vaIP) {
	this.clientIP = getIP(clientIP);
	this.vaIP = getIP(vaIP);
}

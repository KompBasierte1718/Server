const net = require('net');
var logger = require('./logger');
var parseJSON = require('json-parse-async');

/* *** Globale Zustandsvariablen *** */
var isReadyToPair = false;
var codewords = null;
var knownIPs = new Array();
var session = null;
var befehl = null;

/* *** Starte Server *** */
const PORT = 41337;
var server = net.createServer(); // Neue Server Instanz.
server.listen(PORT); // Server Port öffnen.
server.on('connection', onClientConnected_ServerEvent); // Event bei 'connection'
console.log("Listening on port " + PORT); //DEBUG


/* ************************* SERVER-FUNKTIONEN ****************************** */

/* onClientConnected_ServerEvent
 * Reagiert auf die Anfrage eines Clients.
 */
function onClientConnected_ServerEvent(sock) {
	console.log("\n####################################################"); //DEBUG
	console.log("Neue Verbindung von: " + getIP(sock.remoteAddress)); //DEBUG
	logger.logInfo("Neue Verbindung von: " + getIP(sock.remoteAddress));

	sock.on('data', function(data) { // Daten vom Client
		// Request validieren
		var requestArr = splitRequest(data);
		var isHttp = isHTTPHeader(requestArr[0]);
		var isParsable = isParsableRequest(requestArr[1]);

		// HTTP-Header
		var headers = new Map();
		headers.set(200, 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n');
		headers.set(400, 'HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n');

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
		//socket.end(data);
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
	} else { // Die Verbindung besteht bereits.
		console.log("Bereits bekannter PC Client"); //DEBUG
		logger.logInfo("Bereits bekannter PC Client");
		if(content.unregister) { // Client will die Registrierung aufheben.
			logger.logInfo("Registrierung des Clients wird entfernt.");
			console.log("Client Registrierung wird entfernt."); //DEBUG
			unregisterDevice(sock.remoteAddress);
			sock.write('{"answer": "UNREGISTERED"}');
			//endConnection(sock, isHttp, headers.get(200), '{"answer": "UNREGISTERED"}');
		} else if(content.instructions) {
				// Hier werden Befehle an den Anfrageneden Client gesendet!
				if(befehl != null) {
					logger.logInfo("Sende Befehle an PC Client");
					console.log("Sende Befehle an PC Client"); //DEBUG
					sock.write('{"answer": "NEW COMMAND", "program": "' + befehl + '"}');
				} else {
					logger.logInfo("Kein Befehl vorhanden!");
					console.log("Kein Befehl vorhanden!"); //DEBUG
					sock.write('{"answer": "NO COMMANDS"}');
				}
				//endConnection(sock, isHttp, headers.get(200), '{"answer": "Mach deine Hose zu!"}');
		}
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
	} else if(content.result.metadata.intentName == "Programm starten") {
		if(session != null) {
			befehl = content.result.parameters.program;
			logger.logInfo("Neuer Befehl: " + befehl);
			console.log("Neuer Befehl: " + befehl);
			endConnection(sock, isHttp, headers.get(200), '{"speech": "Gebe den Befehl weiter.","displayText": "Gebe den Befehl weiter."}');
		} else {
			logger.logInfo("Befehl erhalten doch keine Session vorhanden.");
			console.log("Befehl erhalten doch keine Session vorhanden.");
			endConnection(sock, isHttp, headers.get(400), '{"speech": "Keine Verbindung zu einem Client vorhanden!","displayText": "Keine Verbindung zu einem Client vorhanden!"}');
		}
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
	} else if(content.befehl) {
		if(session != null) {
			logger.logInfo("Neuer Befehl: " + content.befehl);
			sendInstructions(session.clientIP, "1337", content.befehl);
			endConnection(sock, isHttp, headers.get(200), '{"answer": "DISCONNECTED"}');
		} else {
			logger.logInfo("Befehl erhalten doch keine Session vorhanden.")
			endConnection(sock, isHttp, headers.get(400), '{"answer": "NO SESSION"}');
		}
	}
}

function Session(clientIP, vaIP) {
	this.clientIP = getIP(clientIP);
	this.vaIP = getIP(vaIP);
}

/* ************************* HILFS-FUNKTIONEN ******************************* */

/* splitRequest
 * Liefert ein Array  mit zwei Elementen zurück.
 * Erstes Element ist der HTTP Header, zweites Element ist die JSON.
 * Im Fehlerfall ist eines oder sind beide Elemente '-1'.
 */
function splitRequest(data) {
		var splitArr = new Array();
		splitArr.push('-1');
		splitArr.push('-1');

		if(data == undefined || data == null || data == "") {
			return splitArr;
		}

		var header = getHTTPHeader(data);
		var json = getJSON(data);

		splitArr[0] = header;
		splitArr[1] = json;

		return splitArr;
}

/* getJSON
 * Entfernt alle Chars vor und nach den geschweiften Klammern des JSON.
 * Wurden keine geschweiften Klammern gefunden wird '-1' zurückgegeben.
 */
function getJSON(data) {
	var firstCurlyBracket = data.indexOf("{");
	var lastCurlyBracket = getLastIndexOf(data, "}");

	if(firstCurlyBracket == -1 || lastCurlyBracket == -1) {
		// Keine JSON-Datei
		return "-1";
	}

	// Alles vor und nach den geschweiften Klammern entfernen.
	return data.toString().substring(firstCurlyBracket, lastCurlyBracket+1);
}

function getLastIndexOf(string, char) {
	for(var i = string.length; i > 0; i--) {
		if(string.toString().charAt(i) == char) {
			return i;
		}
	}
	return -1;
}

/* getHTTPHeader
 * Prüft ob der String 'HTTP/http' im Request vorhanden ist.
 * Sollte das der Fall sein wird alles vor der ersten geschweiften Klammer
 * zurückgegeben.
 * Wurden keine geschweiften Klammern gefunden wird der String wieder
 * zurückgegeben.
 * Wurde 'HTTP/http' nicht gefunden wird '-1' zurückgegeben.
 */
function getHTTPHeader(data) {
	var firstCurlyBracket = data.indexOf("{");

	if(!data.toString().match(/http/i)) {
		// Kein HTTP Header
		return "-1";
	}

	if(firstCurlyBracket == -1) {
		// Keine JSON vorhanden.
		return data;
	}

	// JSON entfernen und nur den HTTP-Header zurückgeben.
	return data.toString().substring(0, firstCurlyBracket);
}

/* isParsableRequest
 * Validiert den Request und erzeugt Ausgaben in der Log-Datei.
 * Liefert true zurück wenn es sich bei der Anfrage um eine JSON-Datei handelt.
 */
function isParsableRequest(jsonData) {
	var parsableRequest = false;

	// Validiere Daten der Anfrage.
	if(jsonData == "-1") {
		// Keine JSON vorhanden
		logger.logInfo("Keine JSON-Datei erhalten.");
		console.log("Keine JSON-Datei erhalten."); //DEBUG
	} else {
		// HTTP-Request
		logger.logInfo("JSON-Datei erhalten.");
		console.log("JSON-Datei erhalten."); //DEBUG
		parsableRequest = true;
	}

	return parsableRequest;
}

/* isHTTPHeader
 * Validiert den Request und erzeugt Ausgaben in der Log-Datei.
 * Liefert true zurück wenn es sich bei der Anfrage um einen HTTP-Request
 * handelt.
 */
function isHTTPHeader(httpHeader) {
	var httpRequest = false;

	// Validiere Header der Anfrage.
	if(httpHeader == "-1") {
		// Kein HTTP-Request
		logger.logInfo("TCP-Request");
		console.log("TCP-Request:"); //DEBUG
	} else {
		// HTTP-Request
		logger.logInfo("HTTP-Request");
		console.log("HTTP-Request:"); //DEBUG
		console.log("\n"+httpHeader+"\n"); //DEBUG
		httpRequest = true;
	}

	return httpRequest;
}

/* getIP
 * Schneidet die IP aus socket.remoteAddress
 */
function getIP(ipString) {
	var lastColon = ipString.toString().lastIndexOf(":");
	if(lastColon != -1)
		ipString = ipString.toString().substring(lastColon + 1);
	return ipString;
}

function isKnownDevice(ip) {
	for(var i = 0; i < knownIPs.length; i++) {
		console.log("Bekannte IP: " + knownIPs[i]);
		if(knownIPs[i] == getIP(ip)) {
			return true;
		}
	}
	knownIPs.push(getIP(ip));
	return false;
}

function registerDevice(ip) {
	return isKnownDevice(ip);
}

function unregisterDevice(ip) {
	var tempArr = knownIPs;
	for(var i = 0; i < knownIPs.length; i++) {
		if(knownIPs[i] != getIP(ip)) {
			tempArr.push(knownIPs[i]);
		}
	}
	knownIPs = tempArr;
}

function getLastRegisteredIP() { //DEBUG
	return knownIPs[knownIPs.length-1];
}

function sendInstructions(clientIP, clientPort, instruction) {
	logger.logInfo("Sende Befehle an " + clientIP + ":" + clientPort);
	console.log("Sende Befehle an " + clientIP + ":" + clientPort); //DEBUG
	var http = require('http');
	var options = {
		hostname: clientIP,
		port: clientPort,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		}
	};

	var req = http.request(options, function(res) {
		logger.logInfo("Antwort von " + clientIP + ":" + clientPort);
		logger.logInfo("Status: " + res.statusCode);
		console.log("Antwort von " + clientIP + ":" + clientPort); //DEBUG
		console.log("Status: " + res.statusCode); //DEBUG
		res.setEncoding('utf8');
		res.on('data', function(body) {
			logger.logInfo("Daten: " + body);
			console.log("Daten: " + body); //DEBUG
		});
	});

	req.on('error', function(e) {
		console.log("Fehler beim übermitteln der Befehle! " + e);
		logger.logError("sendInstructions", "Fehler beim übermitteln der Befehle!")
	})

	req.write('{"instruction": "' + instruction + '"}');
	req.end();
}

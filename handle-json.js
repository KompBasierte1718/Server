const net = require('net');
var logger = require('./logger');
var parseJSON = require('json-parse-async');

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
	console.log("\nNeue Verbindung von: " + sock.remoteAddress); //DEBUG
	logger.logInfo("Neue Verbindung von: " + sock.remoteAddress);

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
			return;
		} else {
			parseJSON(requestArr[1], function(err, content) {
				if(err) {
					console.error("\nKann JSON-Datei nicht parsen!"); //DEBUG
					console.error("Inhalt: " + data); //DEBUG
					console.error("Fehler: " + err + "\n"); //DEBUG
					logger.logError("onClientConnected_ServerEvent",
												"JSON konnte nicht geparst werden.");
					endConnection(sock, isHttp, headers.get(400), '{"answer": "JSON NOT PARSABLE"}');
					return;
				} else {
					// JSON-Datei erforlgreich geparst.
					console.log("\nJSON-Datei erforlgreich geparst."); //DEBUG

					switch(content.device) {
						case "pcclient":
							logger.logInfo("Ein PC Client hat sich verbunden!");
							console.log("Gerät: PC Client"); //DEBUG
							if(content.password != undefined) {
								logger.logInfo("Neue Registrierung vom Client angefordert.");
								console.log("Neue Anfrage in der Warteschlange."); //DEBUG
								console.log("Passwort: " + content.password); //DEBUG
								for(var i = 0; i < 100; i++); //DEBUG
								endConnection(sock, isHttp, headers.get(200), '{"answer": "WAITING FOR VA"}');
							} else if(content.confirmation != undefined) {
								logger.logInfo("Client hat paarung bestätigt.");
								if(content.confirmation) {
									console.log("Client will sich verbinden!"); //DEBUG
									endConnection(sock, isHttp, headers.get(200), '{"answer": "PAIRING WITH VA"}');
								}
							} else {
								console.error("Unbekannte Anfrage des PC Client!"); //DEBUG
							}
							break;
						case "google":
							logger.logInfo("Ein Google Gerät hat sich verbunden!");
							console.log("Gerät: Google Home"); //DEBUG
							if(content.result.metadata.intentName == "Koppeln") {
								console.log("Anfrage: " + content.result.resolvedQuery);
								console.log("Codewords: " + content.result.parameters.codewords);
							} else if(content.result.metadata.intentName == "Entkoppeln") {
								console.log("Anfrage: " + content.result.resolvedQuery);
							}
							break;
						case "alexa":
							logger.logInfo("Ein Alexa Gerät hat sich verbunden!");
							console.log("Gerät: Amazon Echo"); //DEBUG
							console.log("Anfrage: Alexa Koppeln"); //DEBUG
							console.log("Codewords: " + content.koppeln.word1 + " " + content.koppeln.word2); //DEBUG
							break;
						default:
							console.error("Gerät: Unbekannt"); //DEBUG
							logger.logError("onClientConnected_ServerEvent",
														"Unbekanntes Gerät.");
							endConnection(sock, isHttp, headers.get(400), '{"answer": "UNKNOWN DEVICE"}');
							return;
					}
				}
			}); // Ende parseJSON
		}
	}); // ENDE socket 'connection'

	// Client möchte die Verbindung beenden.
	sock.on('end', function() {
		console.log("Client möchte Verbindung schließen!"); // DEBUG
		logger.logInfo("Verbindung auf Anfrage von " + sock.remoteAddress
										+ " geschloßen.");
		sock.end();
	}); // ENDE socket 'end'
}

function endConnection(socket, isHttp, httpHeader, data) {
	if(isHttp){
		socket.end(httpHeader + data);
	} else {
		socket.end(data);
	}
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
	var lastCurlyBracket = data.lastIndexOf("}");

	if(lastCurlyBracket == -1) {
		// Fehler wenn die letzte geschlossene Klammer vin hinten gesucht werden soll
		lastCurlyBracket = data.indexOf("}");
	}

	if(firstCurlyBracket == -1 || lastCurlyBracket == -1) {
		// Keine JSON-Datei
		return "-1";
	}

	// Alles vor und nach den geschweiften Klammern entfernen.
	return data.toString().substring(firstCurlyBracket, lastCurlyBracket+1);
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
	} else {
		// HTTP-Request
		logger.logInfo("HTTP-Request");
		console.log("HTTP-Request:"); //DEBUG
		console.log("\n"+httpHeader+"\n"); //DEBUG
		httpRequest = true;
	}

	return httpRequest;
}

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

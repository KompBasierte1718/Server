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

/* isKnownDevice
 * Überprüft ob eine IP bereits in einem Array aus IPs vorhanden ist.
 * Liefert true wenn die IP vorhanden ist, ansonsten false.
 */
function isKnownDevice(ipArr, ip) {
	for(var i = 0; i < ipArr.length; i++) {
		console.log("Bekannte IP: " + ipArr[i]); //DEBUG
		if(ipArr[i] == getIP(ip)) {
			return true;
		}
	}
	return false;
}


/* registerDevice
 * Ist eine IP noch nicht vorhanden, wird diese in das Array aus IPs
 * geschrieben.
 * Liefert true wenn die IP registriert wurde, ansonsten false.
 */
function registerDevice(ipArr, ip) {
  knownDevice = isKnownDevice(ipArr, ip);

  if(!knownDevice) {
    ipArr.push(getIP(ip));
    return true;
  }

	return false;
}


/* unregisterDevice
 * Ist eine IP bereits registriert, wird diese aus dem Array aus IPs entfernt.
 * Gibt das Array aus IPs zurück.
 */
function unregisterDevice(ipArr, ip) {
	var tempArr = ipArr;
	for(var i = 0; i < ipArr.length; i++) {
		if(ipArr[i] != getIP(ip)) {
			tempArr.push(ipArr[i]);
		}
	}
	ipArr = tempArr;
  return ipArr;
}


/* getLastRegisteredIP
 * Liefert die letzte registrierte IP des Arrays aus IPs zurück.
 */
function getLastRegisteredIP(ipArr) {
	return ipArr[ipArr.length-1];
}

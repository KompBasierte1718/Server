/* Datei: mailbox-helper.js
 * Beinhaltet Funktionen welche zum Validieren von Requests nötig sind.
 * Unteranderem:
 * Aufsplitten von Requests in Header und Body.
 * Erkennen von JSON-Dateien.
 * Erkennen von verwendeten Protokollen (HTTP, HTTPs, usw.)
 * Vergleichen von IP Adressen und verwalten dieser in Arrays.
 *
 * Autor: Daniel Nagel
 * Seit:  18.01.2018
 */


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

		var header = getHeader(data);
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
	return data.toString().substring(firstCurlyBracket, lastCurlyBracket + 1);
}


/* getLastIndexOf
 * Liefert den letzten Index eines Zeichens innerhalb eines Strings zurück.
 * Konnte das Zeichen nicht gefunden werden, wird -1 zurück gegeben.
 */
function getLastIndexOf(string, char) {
	for(var i = string.length; i > 0; i--) {
		if(string.toString().charAt(i) == char) {
			return i;
		}
	}
	return -1;
}


/* getHeader
 * Prüft ob der String 'HTTP/http' im Request vorhanden ist.
 * Sollte das der Fall sein wird alles vor der ersten geschweiften Klammer
 * zurückgegeben.
 * Wurden keine geschweiften Klammern gefunden wird der String wieder
 * zurückgegeben.
 * Wurde 'HTTP/http' nicht gefunden wird '-1' zurückgegeben.
 */
function getHeader(data) {
	if(!data.toString().match(/http/i)) {
		// Kein HTTP Header
		return "-1";
	}

  var firstCurlyBracket = data.indexOf("{");
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
	if(jsonData == "-1") {
		// Keine JSON vorhanden
		logger.logInfo("Keine JSON-Datei erhalten.");
		console.log("Keine JSON-Datei erhalten."); //DEBUG
    return false;
	} else {
		// HTTP-Request
		logger.logInfo("JSON-Datei erhalten.");
		console.log("JSON-Datei erhalten."); //DEBUG
		return true;
	}
}


/* isHTTPHeader
 * Validiert den Request und erzeugt Ausgaben in der Log-Datei.
 * Liefert true zurück wenn es sich bei der Anfrage um einen HTTP-Request
 * handelt.
 */
function isHTTPHeader(httpHeader) {
	if(httpHeader == "-1") {
		// Kein HTTP-Request
		logger.logInfo("TCP-Request");
		console.log("TCP-Request:"); //DEBUG
    return false;
	} else {
		// HTTP-Request
		logger.logInfo("HTTP-Request");
		console.log("HTTP-Request:"); //DEBUG
		console.log("\n"+httpHeader+"\n"); //DEBUG
		return true;
	}
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

/* isKnownIP
 * Überprüft ob eine IP bereits in einem Array aus IPs vorhanden ist.
 * Liefert true wenn die IP vorhanden ist, ansonsten false.
 */
function isKnownIP(ipArr, ip) {
	for(var i = 0; i < ipArr.length; i++) {
		console.log("Bekannte IP: " + ipArr[i]); //DEBUG
		if(ipArr[i] == getIP(ip)) {
			return true;
		}
	}
	return false;
}


/* registerIP
 * Ist eine IP noch nicht vorhanden, wird diese in das Array aus IPs
 * geschrieben.
 * Liefert true wenn die IP registriert wurde, ansonsten false.
 */
function registerIP(ipArr, ip) {
  knownIP = isKnownIP(ipArr, ip);

  if(!knownIP) {
    // Bisher unbekannte IP
    ipArr.push(getIP(ip));
    return true;
  }

	return false;
}


/* unregisterIP
 * Ist eine IP bereits registriert, wird diese aus dem Array aus IPs entfernt.
 * Gibt das Array aus IPs zurück.
 */
function unregisterIP(ipArr, ip) {
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

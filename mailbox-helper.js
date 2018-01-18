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

// Referenzen einbinden.
const logger = require('./logger');


 // HTTP Antwort Header
 var headers = new Map();
 headers.set(200, 'HTTP/1.1 200 OK\r\n'
            +'Content-Type: application/json\r\n'+'Connection: close\r\n\r\n');
 headers.set(400, 'HTTP/1.1 400 Bad Request\r\n'
            +'Content-Type: application/json\r\nConnection: close\r\n\r\n');


/* Request
 * Dieses Objekt stellt einen Request dar, bestehend aus:
 * Header, Daten und Protokoll.
 */
function Request(header, protocol, data) {
  this.header = header;
  this.protocol = protocol;
  this.data = data;
}


/* Session
 * Dieses Objekt stellt eine Verbindung zwischen Client und Voice Assistent
 * dar, bestehend aus:
 * Client IP, Voice Assistent IP und den vom Client festgelegten Codewörtern.
 */
function Session(clientIP, vaIP, codeword) {
	this.clientIP = getIP(clientIP);
	this.vaIP = getIP(vaIP);
  this.codeword = codeword;
}


/* splitRequest
 * Teilt den erhaltenen Request in Header und JSON-Datei auf.
 * Rückgabe:
 * Ein Array bestehend aus Header und JSON-Datei.
 * Die Felder beinhalten null wenn kein Header oder keine JSON-Datei gefunden
 * wurde.
 */
function splitRequest(data) {
		var request = new Request(null, null, null);

		if(data == undefined || data == null || data == "") {
			return request;
		}

		request.header = getHeader(data);
    request.protocol = checkUsedProtocol(request.header);
		request.data = getJSONFromBody(data);

		return request;
}


/* getJSON
 * Sucht nach der ersten und letzten geschweiften Klammer innerhalb der Daten.
 * Rückgabe:
 * Substring von der ersten geschweiften Klammer bis zur einschließlich letzten.
 * null wenn eine der beiden Klammern nicht gefunden wurde.
 */
function getJSONFromBody(data) {
	var firstCurlyBracket = data.indexOf("{");
	var lastCurlyBracket = getLastIndexOf(data, "}");

	if(firstCurlyBracket == -1 || lastCurlyBracket == -1) {
		// Keine (valide) gefunden JSON-Datei.
    logger.logInfo("Der Request beinhaltet keine JSON-Datei.");
		console.log("Der Request beinhaltet keine JSON-Datei."); //DEBUG
		return null;
	}

  logger.logInfo("Der Request beinhaltet eine JSON-Datei.");
  console.log("Der Request beinhaltet eine JSON-Datei."); //DEBUG
	// Alles vor und nach den geschweiften Klammern entfernen.
	return data.toString().substring(firstCurlyBracket, lastCurlyBracket + 1);
}


/* getHeader
 * Sucht nach der Zeichenkette "\r\n\r\n", welche am Ende eines Headers steht,
 * innerhalb der Empfangenen Daten.
 * Rückgabe:
 * Substring vom Anfang der Daten bis zur Zeichenkette "\r\n\r\n".
 * null wenn die Zeichenkette "\r\n\r\n" nicht gefunden wurde.
 */
function getHeader(data) {
  var headerEnding = data.indexOf("\r\n\r\n");
	if(headerEnding == -1) {
		// Kein Header vorhanden.
		return null;
	}

	// JSON entfernen und nur den HTTP-Header zurückgeben.
	return data.toString().substring(0, headerEnding);
}


/* getLastIndexOf
 * Sucht das letzte Vorkommen eines Zeichens innerhalb eines Strings.
 * Rückgabe:
 * Index des Zeichens im String
 * -1 wenn das Zeichen nicht gefunden wurde.
 */
function getLastIndexOf(string, char) {
	for(var i = string.length; i > 0; i--) {
		if(string.toString().charAt(i) == char) {
			return i;
		}
	}
	return -1;
}


/* checkUsedProtocol
 * Überprüft welches Protokoll der Request verwendet.
 * Dazu wird im Header nach einer Zeichenkette gesucht.
 * Rückgabe:
 * tcp wenn das verwendete Protokoll unbekannt ist, vermutlich wird TCP verwendet.
 * https wenn das HTTPS Protokoll verwendet wird.
 * http wenn das HTTP Protokoll verwendet wird.
 */
function checkUsedProtocol(header) {
  if(header == null) {
    // Unbekanntes Protokoll, vermutlich TCP-Request
    logger.logInfo("Das verwendete Protokoll des Request ist Unbekannt (TCP).");
    console.log("TCP-Request:"); //DEBUG
    return "tcp";
  } else if(header.toString().match(/https/i)) {
    // HTTPs Header
    logger.logInfo("Das verwendete Protokoll des Request ist HTTPS.");
    console.log("HTTPS-Request:"); //DEBUG
    console.log("\n"+header+"\n"); //DEBUG
    return "https";
  } else if(header.toString().match(/http/i)) {
    // HTTP Header
    logger.logInfo("Das verwendete Protokoll des Request ist HTTP.");
    console.log("HTTP-Request:"); //DEBUG
    console.log("\n"+header+"\n"); //DEBUG
    return "http";
  }
}

/* getIP
 * Schneidet die IP aus socket.remoteAddress
 * Rückgabe:
 * Eine IP-Adresse.
 */
function getIP(ipString) {
	var lastColon = ipString.toString().lastIndexOf(":");
	if(lastColon != -1)
		ipString = ipString.toString().substring(lastColon + 1);
	return ipString;
}


/* isKnownIP
 * Überprüft ob eine IP bereits in einem Array aus IPs vorhanden ist.
 * Rückgabe:
 * true wenn die IP vorhanden ist, ansonsten false.
 */
function isKnownIP(ipArr, ip) {
	for(var i = 0; i < ipArr.length; i++) {
		if(ipArr[i] == getIP(ip)) {
      logger.logInfo("IP " + ipArr[i] + " ist bereits bekannt.");
      console.log("IP " + ipArr[i] + " ist bereits bekannt."); //DEBUG
			return true;
		}
	}
	return false;
}


/* registerIP
 * Ist eine IP noch nicht vorhanden, wird diese in das Array aus IPs
 * geschrieben.
 * Rückgabe:
 * true wenn die IP registriert wurde, ansonsten false.
 */
function registerIP(ipArr, ip) {
  knownIP = isKnownIP(ipArr, ip);

  if(!knownIP) {
    // Bisher unbekannte IP
    ipArr.push(getIP(ip));
    logger.logInfo("IP " + getIP(ip) + " registriert.");
    console.log("IP " + getIP(ip) + " registriert."); //DEBUG
    return true;
  }

	return false;
}


/* unregisterIP
 * Ist eine IP bereits registriert, wird diese aus dem Array aus IPs entfernt.
 * Rückgabe:
 * Array aus IPs.
 */
function unregisterIP(ipArr, ip) {
	var tempArr = ipArr;
	for(var i = 0; i < ipArr.length; i++) {
		if(ipArr[i] != getIP(ip)) {
			tempArr.push(ipArr[i]);
		} else {
      logger.logInfo("IP " + getIP(ip) + " deregistriert.");
      console.log("IP " + getIP(ip) + " deregistriert."); //DEBUG
    }
	}
	ipArr = tempArr;
  return ipArr;
}


/* getLastRegisteredIP
 * Rückgabe:
 * Die letzte registrierte IP des Arrays.
 */
function getLastRegisteredIP(ipArr) {
	return ipArr[ipArr.length-1];
}

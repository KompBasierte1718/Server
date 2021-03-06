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
const logger = require('./mailbox-logger');


// Zu exportierende Objekte definieren.
module.exports = {
  splitRequest: splitRequest,
  headers: headers,
  getIP: getIP,
  registerIP: registerIP,
  unregisterIP: unregisterIP,
  getLastRegisteredIP: getLastRegisteredIP,
  buildDeviceName: buildDeviceName,
  splitDeviceName: splitDeviceName,
  splitInstruction: splitInstruction
}


/* Request
 * Dieses Objekt stellt einen Request dar, bestehend aus:
 * Header, Daten und Protokoll.
 */
function Request(header, protocol, data) {
  this.header = header;
  this.protocol = protocol;
  this.data = data;
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
		return null;
	}

  logger.logInfo("Der Request beinhaltet eine JSON-Datei.");
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
    return "tcp";
  } else if(header.toString().match(/https/i)) {
    // HTTPs Header
    logger.logInfo("Das verwendete Protokoll des Request ist HTTPS.");
    return "https";
  } else if(header.toString().match(/http/i)) {
    // HTTP Header
    logger.logInfo("Das verwendete Protokoll des Request ist HTTP.");
    return "http";
  }
}


/* headers
 * Gibt den passenden HTTP-Header für einen bestimmten Status Code zurück.
 */
function headers(statusCode) {
  if(statusCode == 200) {
    return 'HTTP/1.1 200 OK\r\n'
              +'Content-Type: application/json\r\n'+'Connection: close\r\n\r\n';
  }
  if(statusCode == 400) {
    return 'HTTP/1.1 400 Bad Request\r\n'
              +'Content-Type: application/json\r\nConnection: close\r\n\r\n';
  }
}


/* getIP
 * Schneidet die IP aus socket.remoteAddress
 * Rückgabe:
 * Eine IP-Adresse.
 */
function getIP(ipString) {
  if(ipString  == null)
    return null;

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


/* buildDeviceName
 * Hängt eine eindeutige Device ID an den Device Namen.
 */
function buildDeviceName(name, id) {
  if(id == null || id == undefined) {
    return name;
  }
  return name + "_" + id;
}


/* splitDeviceName
 * Spaltet den DeviceNamen aus der DB auf in Namen und id.
 */
function splitDeviceName(name) {
  if(name == null || name == undefined) {
    return null;
  }
  var underscore = name.indexOf("_");
  if(underscore == -1) {
    return null;
  }

  var deviceArr = new Array();
  deviceArr.push(name.substring(0, underscore)); // Name
  deviceArr.push(name.substring(underscore+1)); // ID

  return deviceArr;
}

function splitInstruction(data) {
   if(data == null || data == undefined) {
     return null;
   }
   var semicolon = data.indexOf(";");
   if(semicolon == -1) {
     return null;
   }
   var stripe= data.indexOf("|");
   if(stripe == -1) {
     return null;
   }

   var deviceArr = new Array();
   deviceArr.push(data.toString().substring(0, semicolon)); // Device
   deviceArr.push(data.toString().substring(semicolon+1, stripe)); // Instruction
   deviceArr.push(data.toString().substring(stripe+1)); // Task

   return deviceArr;
 }

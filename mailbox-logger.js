/* Datei: mailbox-logger.js
 * Loggt Ereignisse vom Server in einer Textdatei.
 *
 * Log 'live' verfolgen mit tail -f /pfad/zur/log/datei
 *
 * Autor: Daniel Nagel
 * Seit:  18.01.2018
 */


/* *** Globale Variablen *** */
const logfile = "server.log";
var server = "";

// Zu exportierende Objekte definieren.
module.exports = {
  setServer: setServer,
  logInfo: logInfo,
  logError: logError,
  spacer, spacer
}


/* setServer
 * Logt den gewählten Namen des Server, damit die Logs unterschieden werden
 * können.
 */
function setServer(string) {
  server = string;
}

/* logInfo
 * Loggt Information über Ereignisse in einer Datei.
 */
function logInfo(data) {
  var fs = require('fs');
  var logInfo = "[" + createTimeStamp() + " INFO  ] {" + server + "} :" + data + "\n";
	fs.appendFile(logfile, logInfo, function(err) {
		if(err) throw err;
	});
}

/* logError
 * Loggt Fehler in einer Datei, mit dem Funktionsnamen in der der Fehler
 * auftrat.
 */
function logError(funct, data) {
  var fs = require('fs');
  var logError = "[" + createTimeStamp() + " ERROR ] {" + server + "} :" + funct + ": " + data + "\n";
	fs.appendFile(logfile, logError, function(err) {
		if(err) throw err;
	});
}

/* spacer
 * Eine optische Begrenzung, um den Anfang und das Ende eines log Vorgangs zu
 * markieren.
 */
function spacer() {
  var fs = require('fs');
  var logSpacer = "[" + createTimeStamp() + " SPACER]:+--------------------------------------------+\n";
  fs.appendFile(logfile, logSpacer, function(err) {
    if(err) throw err;
  });
}

/* createTimeStamp
 * Erstellt einen Zeitstempel im Format dd.mm.yyyy hh:mm:ss und gibt diesen
 * als String zurück.
 */
function createTimeStamp() {
	var date = new Date();

	var day = date.getDate();
	if(day < 10) {
		day = "0" + day;
	}

	var month = date.getMonth() + 1;
	if(month < 10) {
		month = "0" + month;
	}

  var hours = date.getHours() + 1;
	if(hours < 10) {
		hours = "0" + hours;
	}

  var minutes = date.getMinutes() + 1;
  if(minutes < 10) {
    minutes = "0" + minutes;
  }

  var seconds = date.getSeconds() + 1;
  if(seconds < 10) {
    seconds = "0" + seconds;
  }

	var timestamp = day + "." + month + "." + date.getFullYear()
					         + " " + hours + ":" + minutes + ":" + seconds;
	return timestamp;
}

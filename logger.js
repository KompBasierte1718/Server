const logfile = "server.log";

/* logInfo
 * Loggt Information über Ereignisse in einer Datei.
 */
exports.logInfo = function(data) {
    var fs = require('fs');
    var logInfo = "[" + createTimeStamp() + " INFO ]:" + data + "\n";
	fs.appendFile(logfile, logInfo, function(err) {
		if(err) throw err;
	});
}

/* logError
 * Loggt Fehler in einer Datei, mit dem Funktionsnamen in der der Fehler
 * auftrat.
 */
exports.logError = function(funct, data) {
    var fs = require('fs');
    var logError = "[" + createTimeStamp() + " ERROR]:" + funct + ": " + data + "\n";
	fs.appendFile(logfile, logError, function(err) {
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

	var timestamp = day + "." + month + "." + date.getFullYear()
					+ " " + date.getHours()
					+ ":" + date.getMinutes() + ":" + date.getSeconds();
	return timestamp;
}

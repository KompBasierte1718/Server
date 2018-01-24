/* Datei: mailbox-filehandler.js
 * Schreibt und löscht die tempöräre Datei instruction.temp
 *
 * Autor: Daniel Nagel
 * Seit:  24.01.2018
 */


// Referenzen einbinden
var fs = require('fs');


/* *** Globale Variablen *** */
var fileName = "instruction.temp";


// Zu exportierende Objekte definieren.
module.exports = {
  writeFile: writeFile,
  readFile: readFile
}

/* writeFile
 * Loggt Information über Ereignisse in einer Datei.
 */
function writeFile(data) {
  fs.writeFile(fileName, data, function(err) {
		if(err) throw err;
	});
}

function readFile() {
  fs.read(fileName, function(data, err) {
    if(err) throw err;
    return data;
  });
}

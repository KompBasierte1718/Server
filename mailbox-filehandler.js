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
 * Schreibt erhaltene Befehle in der Textdatei "instruction.temp".
 */
function writeFile(data) {
  fs.writeFile(fileName, data, function(err) {
		if(err) throw err;
	});
}

/*readFile
 * Liest die Textdatei "instruction.temp".
 */
function readFile() {
  return fs.readFileSync(fileName);
}

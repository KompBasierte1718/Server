const net = require('net');
var logger = require('./logger');
var parseJSON = require('json-parse-async');
var JsonSocket = require('json-socket');
const PORT = 41337;

var server = net.createServer(); // Server Instanz
server.listen(PORT);

/*server.on('connection', function(socket) {
	socket = new JsonSocket(socket); // Standard net.socket wird zu JsonSocket
	socket.on('message', function(message) {
		var result = "Hallo Welt!";
		socket.sendEndMessage({result: result});
	}
});*/
// Server Event
onClientConnected_ServerEvent = function(sock) {
	console.log("\nNeue Verbindung!");
	sock.on('data', function(data) { // Daten vom Client
		header = getHTTPHeader(data);
		json = getJSON(data);
		console.log("Header: " + header);
		parseJSON(json, function(err, content) {
			if(err) {
				console.error('Error when trying to parse json received is '
								+ data + ', and the error is ' + err);
				logger.logError("onClientConnected_ServerEvent", "JSON konnte nicht geparst werden.");
				sock.write("ERR: No JSON!");
			} else {
				console.log("\nJSON erhalten");
				if(content.result == undefined) {
					if(content.password != undefined) {
						console.log("Neue Anfrage in der Warteschlange.");
						console.log("Passwort: " + content.password);
						for(var i = 0; i < 100; i++);
						sock.write("{answer: \"Waiting for VA\"}\0");
					} else if(content.confirmation != undefined) {
						if(content.confirmation) {
							console.log("Client will sich verbinden!");
							sock.write("{answer: \"well okay mate\"}\0");
						}
					}
					if(content.koppeln != undefined){
						console.log("Anfrage: Alexa Koppeln");
						console.log("Codewords: " + content.koppeln.word1 + " " + content.koppeln.word2);
					}
				} else {
				if(content.result.metadata.intentName == "Koppeln") {
					console.log("Anfrage: " + content.result.resolvedQuery);
					console.log("Codewords: " + content.result.parameters.codewords);
				} else if(content.result.metadata.intentName == "Entkoppeln") {
					console.log("Anfrage: " + content.result.resolvedQuery);
				}
				}
			}
		});
	// Verbindung soll geschloßen werden.
	sock.on('end', function() {
		console.log("\nVerbindung geschloßen!");
		sock.end();
	});
	sock.on('timeout', function() {
		console.log("\nTimoeout!");
		sock.end();
	});
	//	console.log(data);
	//	sock.sendEndMessage({test: test});
	});
}

// Server Event bei 'connection'
server.on('connection', onClientConnected_ServerEvent);


// Header aus HTTP Request entfernen.
function getJSON(data) {
	if(data == undefined || data == null || data == "") {
		return "Keine Daten";
	}
	var firstCurlyBracket = data.indexOf("{");

	if(firstCurlyBracket === -1) {
		return "Keine JSON";
	} else {
		return data.toString().substring(firstCurlyBracket);
	}
}

function getHTTPHeader(data) {
	if(data == undefined || data == null || data == "") {
		return "Keine Daten";
	}
	var firstCurlyBracket = data.indexOf("{");

	if(firstCurlyBracket === -1) {
		return data;
	} else {
		return data.toString().substring(0, firstCurlyBracket);
	}
}

console.log("Listening on port " + PORT);

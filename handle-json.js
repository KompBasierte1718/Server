const net = require('net');
var parseJSON = require('json-parse-async');
const PORT = 41337;

var server = net.createServer(); // Server Instanz
server.listen(PORT);

// Server Event
onClientConnected_ServerEvent = function(sock) {
  sock.on('data', function(data) { // Daten vom Client
    json = getJSON(data);
    parseJSON(json, function(err, content) {
      if(err) {
        console.error('Error when trying to parse json received is '
          + data + ', and the error is ' + err);
        sock.end();
      } else {
        console.log("\nJSON erhalten");
        if(content.result == undefined) {
          console.log(content);
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

console.log("Listening on port " + PORT);

// SockJS server-side wrapper

var fs = require('fs'),
    sockjs = require('sockjs');

var openSocketsById = {};

module.exports = function(ss, messageEmitter, httpServer, config){

  var config = config || {};
  config.server = config.server || {};
  config.client = config.client || {};

  // Send SockJS client-side code
  var sockJsClient = fs.readFileSync(__dirname + '/client/lib.min.js', 'utf8');
  ss.client.send('lib', 'sockjs-client', sockJsClient, {minified: true});

  // Send socketstream-transport module
  var code = fs.readFileSync(__dirname + '/client/wrapper.js', 'utf8');
  ss.client.send('mod', 'socketstream-transport', code);

  // Tell the SocketStream client to use this transport, passing any client-side config along to the wrapper
  ss.client.send('code', 'transport', "require('socketstream').assignTransport(" + JSON.stringify(config.client) + ");");

  // don't set up server for CLI and test
  if (httpServer == null) return;

  // Create a new SockJS server and bind to /ws
  var ws = sockjs.createServer(config.server);
  ws.installHandlers(httpServer, {prefix: '/ws'});

  // Handle incoming connections
  ws.on('connection', function(socket) {

    // Allow this connection to be addressed by the socket ID
    openSocketsById[socket.id] = socket;

    socket.on('data', function(msg) {

      var i;

      try {
        
        // First parse raw incoming message to get responderId
        if ( (i = msg.indexOf('|')) > 0) {

          var responderId = msg.substr(0, i),
                  content = msg.substr(i+1);
        
        } else { throw('Message does not contain a responderId');}

        // If this responderId is 'X', assume this is a system message
        if (responderId === 'X') {

          // Set the sessionId against this socket and tell the client we're ready for requests
          var rawSessionId = content.split('.')[0];
          socket.sessionId = rawSessionId.split(':')[1].replace(/\s/g, '+');
          socket.write('X|OK');

        // Otherwise go ahead and process a regular incoming message
        } else if (socket.sessionId) {

          var meta = {socketId: socket.id, sessionId: socket.sessionId, clientIp: socket.remoteAddress, transport: 'sockjs'}

          // Invoke the relevant Request Responder, passing a callback function which
          // will automatically direct any response back to the correct client-side code
          messageEmitter.emit(responderId, content, meta, function(data){
            socket.write(responderId + '|' + data);
          });
        
        }

      } catch (e) {
        console.log('Invalid websocket message received:', msg);
      }

    });

    // If the browser disconnects, remove this connection from openSocketsById
    socket.on('close', function() {
      if(openSocketsById[socket.id]) delete openSocketsById[socket.id];
    });

  });

  // Return API for sending events
  // Note the '0' message prefix (which signifies the responderId) is reserved for sending events
  return {

    event: function() {

      return {
      
        // Send the same message to every open socket
        all: function(msg) {
          for (id in openSocketsById)
            openSocketsById[id].write('0|' + msg + '|null');
        },

        // Send an event to a specific socket
        // Note: 'meta' is typically the name of the channel
        socketId: function(id, msg, meta) {
          if (socket = openSocketsById[id]) {
            return socket.write('0|' + msg + '|' + meta)
          } else {
            return false;
          }

        }

      }
    }
  }
}


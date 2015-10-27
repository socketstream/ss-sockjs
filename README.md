# SockJS Websocket Transport for SocketStream

SockJS transport integration is built into SocketStream 0.5.0

You can read more about the benefits of SockJS here:

https://github.com/sockjs/sockjs-node (server)
https://github.com/sockjs/sockjs-client (client)


### Installation

To use SockJS in your app, first add install SockJS:

```
$ npm install sockjs --save
```

Then add the following to your app.

```javascript
ss.ws.transport.use('sockjs');
```

That's it! The necessary client-side code will automatically be sent to the browser and you don't need to change a line of your application code.


### Configuring

Options can be passed directly to the `server` or `client` SockJS library. For example, to override the default `log` function on the server and turn on debugging in the client use:

```javascript
ss.ws.transport.use('sockjs', {
  client: {
    debug: true
  },
  server: {
    log: function(severity, message){
      console.log('Custom logger >>>', severity, message);
    }
  }
});
```


### Known issues

1. This is the very first release - expect some issues
2. SockJS does not handle reconnection as well as Socket.IO. This will be investigated and improved in future

Pull requests welcome on socketstream/socketstream!

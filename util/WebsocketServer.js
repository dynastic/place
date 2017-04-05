const socketIO = require("socket.io");

function WebsocketServer(app, httpServer) {
    var server = socketIO(httpServer);
    console.log("Websocket server attached to HTTP server.");

    let obj = {
        server: server,
        connectedClients: 0,

        setup: function() {
            var a = this;
            this.server.on('connection', socket => {
                a.connectedClients++;
                a.sendConnectedClientBroadcast();

                socket.on('disconnect', function () {
                    a.connectedClients--;
                    a.sendConnectedClientBroadcast();
                });
            });
        },

        sendConnectedClientBroadcast: function() {
            this.broadcast("user_change", { count: this.connectedClients });
        },

        broadcast: function(name, payload) {
            this.server.sockets.emit(name, payload);
        }
    }
    obj.setup();
    return obj;
}

WebsocketServer.prototype = Object.create(WebsocketServer.prototype);

module.exports = WebsocketServer;
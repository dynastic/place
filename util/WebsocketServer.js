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
                socket.on('disconnect', function () {
                    a.connectedClients--;
                });
            });
            setInterval(() => a.checkUserCount(), 1000);
        },

        sendConnectedClientBroadcast: function() {
            this.broadcast("user_change", { count: this.connectedClients });
        },

        broadcast: function(name, payload) {
            this.server.sockets.emit(name, payload);
        },

        checkUserCount: function() {
            if(!this.lastConnectedClientBroadcastCount || this.lastConnectedClientBroadcastCount != this.connectedClients) this.sendConnectedClientBroadcast();
        }
    }
    obj.setup();
    return obj;
}

WebsocketServer.prototype = Object.create(WebsocketServer.prototype);

module.exports = WebsocketServer;
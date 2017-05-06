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
            this.broadcastRaw("user_change", this.connectedClients);
        },

        broadcast: function(name, payload = null) {
            var jsonPayload = null;
            if(payload) jsonPayload = JSON.stringify(payload);
            this.broadcastRaw(name, jsonPayload);
        },

        broadcastRaw: function(name, payload = null) {
            this.server.sockets.emit(name, payload);
        },

        checkUserCount: function() {
            if(!this.lastConnectedClientBroadcastCount || this.lastConnectedClientBroadcastCount != this.connectedClients) {
                this.lastConnectedClientBroadcastCount = this.connectedClients;
                this.sendConnectedClientBroadcast();
            }
        }
    }
    obj.setup();
    return obj;
}

WebsocketServer.prototype = Object.create(WebsocketServer.prototype);

module.exports = WebsocketServer;
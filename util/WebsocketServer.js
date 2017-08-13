const socketIO = require("socket.io");
const Pixel = require("../models/pixel");

function WebsocketServer(app, httpServer) {
    var server = socketIO(httpServer);
    app.logger.log('Websocket Server', "Attached to HTTP server.");

    let obj = {
        server: server,
        connectedClients: 0,

        setup: function() {
            var a = this;
            this.server.on("connection", (socket) => {
                var hasRequestedFetch = false;
                a.connectedClients++;
                socket.on("disconnect", () => {
                    a.connectedClients--;
                });
                socket.on("fetch_pixels", (ts) => {
                    var currentTS = Math.floor(Date.now() / 1000);
                    // Do nothing if request wants older than a minute, or is ahead of the current system time.
                    if(!ts || ts < currentTS - 60 || ts > currentTS) return;
                    // Only allow one fetch per socket (no spam pls!)
                    if(hasRequestedFetch) {
                        app.logger.info('Websocket Server', "Disconnected client for requesting fetch more than once.")
                        return socket.disconnect();
                    }
                    hasRequestedFetch = true;
                    var date = new Date(ts * 1000);
                    Pixel.find({lastModified: { $gte: date }}).then((pixel) => {
                        var info = pixel.map((p) => p.getSocketInfo());
                        socket.emit("tiles_placed", JSON.stringify({pixels: info}));
                    }).catch((err) => {
                        app.logger.capture("Error fetching pixel for websocket client: " + err);
                    })
                })
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
    };
    obj.setup();
    return obj;
}

WebsocketServer.prototype = Object.create(WebsocketServer.prototype);

module.exports = WebsocketServer;
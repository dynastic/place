const ws = require("uws");
const Pixel = require("../models/pixel");

function WebsocketServer(app, httpServer) {
    app.logger.log('Websocket Server', "Attached to HTTP server.");

    class SocketServer {
        setup() {
            this.server = new ws.Server({server: httpServer});
            this.connectedClients = 0;
            this.server.on("connection", (socket) => {
                let hasRequestedFetch = false;
                this.connectedClients++;
                socket.onclose = () => this.connectedClients === 0 ? 0 : this.connectedClients--;
                socket.onmessage = (event) => {
                    const {data} = event;
                    if (data.r === "fetch_pixels") {
                        const {ts} = data.d;
                        const currentTS = Math.floor(Date.now() / 1000);
                        if (!ts || (ts < (currentTS - 60)) || (ts > currentTS)) {
                            return;
                        }

                        const selectorDate = new Date(ts * 1000);
                        Pixel.find({lastModified: {$gte: selectorDate}}).then((pixel) => {
                            const info = pixel.map((p) => p.getSocketInfo());
                            socket.send({e: "tiles_placed", d: JSON.stringify({pixels: info})});
                        }).catch((err) => {
                            app.logger.capture("Error fetching pixel for websocket client: " + err);
                        });
                    }
                }
            });
            setInterval(() => this.checkUserCount(), 1000);
            return this;
        }

        sendConnectedClientBroadcast() {
            this.broadcastRaw("user_change", this.connectedClients);
        }

        broadcast(name, payload = null) {
            this.broadcastRaw(name, payload);
        }

        broadcastRaw(name, payload = undefined) {
            this.server.clients.forEach((client) => {
                client.send(JSON.stringify({e: name, d: payload}));
            });
        }

        checkUserCount() {
            if (!this.lastConnectedClientBroadcastCount || (this.lastConnectedClientBroadcastCount != this.connectedClients)) {
                this.lastConnectedClientBroadcastCount = this.connectedClients;
                this.sendConnectedClientBroadcast();
            }
        }
    }

    return new SocketServer().setup();
}

WebsocketServer.prototype = Object.create(WebsocketServer.prototype);

module.exports = WebsocketServer;
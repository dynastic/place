// const ws = require("nodejs-websocket");

function WebsocketServer(app) {
    return {
        server: null,

        start: function() {
            // TODO: Fix websockets
        }
    }
}

WebsocketServer.prototype = Object.create(WebsocketServer.prototype);

module.exports = WebsocketServer;
const {PlaceSocket} = require("./PlaceSocket");

let hardSocketLimit = 20;
const socketTimeoutMinutes = 5;
const activityThresholdMilliseconds = 30000;
const connectionCloseWarningSeconds = 10;

const maxSocketLimit = {e: "max_sockets", d: {success: false, error: {message: "You have reached the maximum concurrent socket connections."}}};
exports.SocketController = class SocketController {
    constructor() {
        /**
         * @type {Map<string, PlaceSocket[]>}
         */
        this.sockets = new Map();

        /**
         * @type {Array<(socket: PlaceSocket, next: () => void) => void)>}
         * @private
         */
        this.socketMiddleware = [];

        setInterval(() => this.purgeSockets.bind(this)(), 5000);
    }

    /**
     * Registers a socket by its IP address
     * 
     * @param {ws} socket The websocket to register
     */
    register(socket) {
        const placeSocket = new PlaceSocket(socket, this.options);

        const socketList = this.sockets.get(placeSocket.ip);
        if (socketList) {
            if ((socketList.length + 1) >= hardSocketLimit) {
                placeSocket.close("max_sockets");
                return;
            }
        }

        const endingMiddleware = () => {
            if (!this.sockets.has(placeSocket.ip)) {
                this.sockets.set(placeSocket.ip, []);
            }
            const list = this.sockets.get(placeSocket.ip);
            list.push(placeSocket);
            placeSocket._closeFunction = function() {
                list.splice(list.indexOf(this), 1);
            }
        }
        const parsedMiddlware = this.socketMiddleware.concat(endingMiddleware);
        let nextMiddleware = -1;
        const next = () => {
            nextMiddleware++;
            parsedMiddlware[nextMiddleware](placeSocket, next);
        };
        next();


    }

    /**
     * Registers a middleware to be called whenever a socket is registered
     * 
     * Do not call next if you do not want the socket to be registered.
     * 
     * @param {(socket: PlaceSocket, next: () => void) => void} middleware The middleware to use
     */
    use(middleware) {
        this.socketMiddleware.push(middleware);
    }

    /**
     * Dispatches a payload with the given event name
     * 
     * @param {string} event The event name
     * @param {any} payload The payload
     */
    dispatch(event, payload = undefined) {
        return new Promise((resolve, reject) => {
            Promise.all(this.__connectedClientSockets.map(socket => socket.dispatch(event, payload))).then(resolve).catch(reject);
        });
    }

    /**
     * Purges all inactive sockets or closed sockets
     */
    purgeSockets() {
        return new Promise((resolve, reject) => {
            const oldestAcceptableSocketTimestamp = this.oldestAcceptableSocketTimestamp;
            const sockets = this.__connectedClientSockets;
            for (let i = 0; i < sockets.length; i++) {
                const socket = sockets[i];
                if (socket.isClient && socket.shouldBeTimedOut) {
                    if (socket.lastMessage >= oldestAcceptableSocketTimestamp) {
                        continue;
                    }
                    if (!socket.timeoutStats.checkedForActivity) {
                        socket.dispatch("activity_check");
                        socket.timeoutStats.checkedForActivity = true;
                        continue;
                    }
                    if (!socket.timeoutStats.warned) {
                        socket.dispatch("timeout_warning");
                        socket.timeoutStats.warned = true;
                        setTimeout(() => {
                            if (!socket.timeoutStats.warned) {
                                return;
                            }
                            socket.close("idle_timeout");
                        }, connectionCloseWarningSeconds * 1000);
                    }
                }
            }
            resolve();
        });
    }

    /**
     * Computes the oldest timestamp accepted right now
     */
    get oldestAcceptableSocketTimestamp() {
        return Date.now() - this.socketTimeoutMS;
    }

    /**
     * Gets the socket timeout threshold in milliseconds
     */
    get socketTimeoutMS() {
        return socketTimeoutMinutes * 60 * 1000;
    }

    /**
     * Gets the total number of connected clients
     */
    get connectedClients() {
        return this.__connectedClientSockets.filter(socket => socket.isClient).length;
    }

    /**
     * @private
     */
    get __connectedClientSockets() {
        let sockets = [];
        const sockets2D = Array.from(this.sockets.values());
        for (let i = 0; i < sockets2D.length; i++) {
            let sockets1D = sockets2D[i];
            for (let j = 0; j < sockets1D.length; j++) {
                sockets.push(sockets1D[j]);
            }
        }
        return sockets;
    }

    /**
     * The maximum sockets that can be connected from a given IP address
     */
    get socketLimit() {
        return hardSocketLimit;
    }

    get options() {
        return {
            hardSocketLimit,
            socketTimeoutMinutes,
            activityThresholdMilliseconds
        };
    }

    /**
     * Updates the socket limit, purging any sockets that violate the criteria
     */
    set socketLimit(value) {
        hardSocketLimit = value;
        this.sockets.forEach((sockets, key) => {
            if (sockets.length > hardSocketLimit) {
                sockets.slice(hardSocketLimit - 1).forEach(socket => {
                    socket.socket.close(0, JSON.stringify(maxSocketLimit));
                });
                this.sockets.set(key, sockets.filter(socket => socket.open));
            }
        });
    }
}
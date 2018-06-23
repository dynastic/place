class PlaceSocket extends EventEmitter3 {
    /**
     * @param {string} clientType the client type
     */
    constructor(clientType) {
        super();
        /**
         * @type {WebSocket}
         */
        this.socket = null;
        this.options = {
            renewalInterval: 5000,
            statTimeout: 30000,
        };
        this.state = {
            lastStat: Date.now(),
            idling: false,
            /**
             * @type {[string, any][]}
             */
            queue: [],
            receivedTimeoutWarning: false,
            reconnecting: false,
            terminated: false,
        };
        this.clientType = clientType;
        this.initializeSocket();
        this.loadEvents();
    }

    /**
     * Sends a request to the server
     * 
     * @param {string} request The request name
     * @param {any} payload The data
     * @param {boolean} allowQueuing Whether or not the data should be added to the queue if the socket isn't connected
     */
    send(request, payload, allowQueuing = true) {
        console.log("Socket client wants to send request:", request, this.connected);
        if (!this.connected) {
            if (allowQueuing) this.state.queue.push([request, payload]);
            return;
        }
        this.socket.send(JSON.stringify({r: request, d: payload}));
    }

    initializeSocket() {
        if (this.state.terminated) {
            return;
        }

        this.socket = new WebSocket(`ws${window.location.protocol === "https:" ? "s" : ""}://${window.location.host}`);

        this.socket.addEventListener("open", () => {
            this.state.reconnecting = false;
            this.state.idling = false;
            this.state.receivedTimeoutWarning = false;

            this.send("identify", {clientType: this.clientType});
            // Processes any packets that failed to send while the socket was disconnected
            if (this.state.queue.length > 0 && this.connected) {
                for (let i = 0; i < this.state.queue.length; i++) {
                    const [request, payload] = this.state.queue[i];
                    console.log("Re-sending packets from before disconnection:", request, this.connected);
                    this.send(request, payload, false);
                }
                this.state.queue = [];
            }
            this.emit("open");
        });

        const handleClosed = () => {
            this.emit("close");
            if (this.state.reconnecting || this.state.idling) {
                return;
            }
            this.state.reconnecting = true;
            setTimeout(() => {
                this.initializeSocket();
            }, this.options.renewalInterval);
        }

        this.socket.addEventListener("error", handleClosed);
        this.socket.addEventListener("close", handleClosed);

        this.socket.addEventListener("message", (event) => {
            const rawData = event.data;
            let data;
            try {
                data = JSON.parse(rawData);
            } catch (e) {
                console.error(`Couldn't parse the server payload:\n${e}`);
                return;
            }
            if (!data.e) {
                console.error("Server payload did not contain an event header");
                return;
            }
            const eventName = data.e;
            const eventData = data.d;
            this.emit(eventName, eventData);
        });
    }

    loadEvents() {
        if (this.state.loadedInternalEvents) {
            return;
        }

        this.on("stat", () => {
            this.state.lastStat = Date.now();
            if (this.state.idling) {
                this.initializeSocket();
                return;
            }
            if (this.state.receivedTimeoutWarning) {
                this.send("activity");
                this.state.receivedTimeoutWarning = false;
            }
        });

        this.on("timeout_warning", () => {
            if (!this.afk) {
                this.send("activity");
                return;
            }
            this.state.receivedTimeoutWarning = true;
        });

        this.on("activity_check", () => {
            if (!this.afk) {
                this.send("activity");
            }
        });

        this.on("idle_timeout", () => {
            this.state.idling = true;
        });

        this.on("hello", (data) => {
            const {options} = data;
            if (!options || typeof options !== "object" || isNaN(options.activityTimeout)) {
                console.error("Got a bad hello packet from the server.");
                return;
            }
            const {activityTimeout} = options;
            this.options.statTimeout = activityTimeout;
        });

        this.on("max_sockets", () => this.state.terminated = true);

        this.state.loadedInternalEvents = true;
    }

    get afk() {
        if (this.clientType !== "client") {
            return false;
        }
        const {lastStat} = this.state;
        const offset = Date.now() - this.options.statTimeout;
        return lastStat < offset;
    }

    get connected() {
        return this.socket.readyState === this.socket.OPEN;
    }
}
//
//  Place.js
//  -----------
//  Written by AppleBetas and nullpixel. Inspired by Reddit's /r/place.
//

var size = 1400;

var canvasController = {
    isDisplayDirty: false,

    init: function(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        // Disable image smoothing
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;
    },

    clearCanvas: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isDisplayDirty = true;
    },

    drawImage: function(image) {
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
        this.isDisplayDirty = true;
    },

    drawImageData: function(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
        this.isDisplayDirty = true;
    },

    setPixel: function(colour, x, y) {
        this.ctx.fillStyle = colour;
        this.ctx.fillRect(x, y, 1, 1);
        this.isDisplayDirty = true;
    }
};

var notificationHandler = {
    notificationsSupported: "Notification" in window, supportsNewNotificationAPI: false,

    setup: function() {
        if(navigator.serviceWorker) {
            navigator.serviceWorker.register("/js/build/sw.js");
            this.supportsNewNotificationAPI = true;
        }
    },

    canNotify: function() {
        if (!this.notificationsSupported) return false;
        return Notification.permission == "granted";
    },

    isAbleToRequestPermission: function() {
        if(!this.notificationsSupported) return false;
        return Notification.permission !== "denied" || Notification.permission === "default";
    },

    requestPermission: function(callback) {
        if(!this.isAbleToRequestPermission || !this.notificationsSupported) return callback(false);
        Notification.requestPermission((permission) => {
            callback(permission === "granted");
        })
    },

    sendNotification: function(title, message, requesting = false) {
        if(!this.notificationsSupported) return;
        let canSend = this.canNotify;
        if(!canSend && !requesting) return;
        if(!canSend) {
            return this.requestPermission((granted) => {
                if (granted) this.sendNotification(message, requesting);
            });
        }
        try {
            // Failsafe so it doesn't get stuck on 1 second
            new Notification(title, {
                body: message
            });
        } catch(e) {
            console.error("Tried to send notification via old API, but failed: " + e);
        }
    }
}

var hashHandler = {
    getHash: function() {
        return this.decodeHash(window.location.hash);
    },

    setHash: function(hash) {
        let encodedHash = this.encodeHash(hash);
        if("history" in window) window.history.replaceState(null, null, "#" + encodedHash);
        else window.location.hash = encodedHash;
    },

    modifyHash: function(newHash) {
        Object.assign(this.getHash(), newHash);
        this.setHash(newHash);
    },

    decodeHash: function(hashString) {
        if(hashString.indexOf("#") === 0) hashString = hashString.substring(1);
        if (hashString.length <= 0) return {};
        let hashArguments = hashString.split("&");
        var decoded = {};
        hashArguments.forEach(function(hashArg) {
            let parts = hashArg.split("=");
            let key = parts[0], value = parts[1];
            if(key) decoded[key] = value;
        });
        return decoded;
    },

    encodeHash: function(hash) {
        return $.param(hash);
    }
}

var place = {
    zooming: {
        zoomedIn: false,
        panFromX: 0, panFromY: 0,
        panToX: null, panToY: null,
        zooming: false,
        zoomFrom: 0,
        zoomTo: 0,
        zoomTime: 0,
        zoomHandle: null,
        fastZoom: false
    },
    keys: {
        left: [37, 65],
        up: [38, 87],
        right: [39, 68],
        down: [40, 83]
    },
    keyStates: {},
    socket: null,
    zoomButton: null,
    dragStart: null,
    placing: false, shouldShowPopover: false,
    panX: 0, panY: 0,
    DEFAULT_COLOURS: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],
    selectedColour: null, handElement: null, unlockTime: null, secondTimer: null, lastUpdatedCoordinates: {x: null, y: null}, loadedImage: false,
    notificationHandler: notificationHandler, hashHandler: hashHandler,
    messages: null,
    isOutdated: false,

    start: function(canvas, zoomController, cameraController, displayCanvas, colourPaletteElement, coordinateElement, userCountElement, gridHint, pixelDataPopover, grid) {
        this.canvas = canvas; // moved around; hidden
        this.canvasController = canvasController;
        this.canvasController.init(canvas);
        this.grid = grid;
        this.displayCanvas = displayCanvas; // used for display

        this.coordinateElement = coordinateElement;
        this.userCountElement = userCountElement;
        this.gridHint = gridHint;
        this.pixelDataPopover = pixelDataPopover;

        this.notificationHandler.setup();

        this.colourPaletteElement = colourPaletteElement;
        this.setupColours();
        this.placingOverlay = $(this.colourPaletteElement).children("#placing-modal");
        this.placeTimer = $(this.colourPaletteElement).children("#place-timer");
        $(this.placeTimer).on("click", "#notify-me", () => this.handleNotifyMeClick());
        let app = this;
        $(this.colourPaletteElement).on("click", ".colour-option", function() {
            let colourID = parseInt($(this).data("colour"));
            if(colourID) app.selectColour(colourID);
        });
        $(this.colourPaletteElement).click(function(e) {
            if(e.target !== this) return;
            app.deselectColour();
        })
        this.updatePlaceTimer();

        let controller = $(zoomController).parent()[0];
        canvas.onmousemove = (event) => this.handleMouseMove(event || window.event);
        canvas.addEventListener("contextmenu", (event) => this.contextMenu(event));

        var handleKeyEvents = function(e) {
            var kc = e.keyCode || e.which;
            app.keyStates[kc] = e.type == "keydown";
        }

        document.body.onkeyup = function(e) {
            if(document.activeElement.tagName != "INPUT") handleKeyEvents(e);
        }
        document.body.onkeydown = function(e) {
            if(document.activeElement.tagName != "INPUT") {
                handleKeyEvents(e);
                app.handleKeyDown(e.keyCode || e.which);
            }
        };

        window.onresize = () => this.handleResize();
        window.onhashchange = () => this.handleHashChange();

        this.zoomController = zoomController;
        this.cameraController = cameraController;
        this.setupDisplayCanvas(this.displayCanvas);
        this.setupInteraction();

        let spawnPoint = this.getSpawnPoint();
        this.setCanvasPosition(spawnPoint.x, spawnPoint.y);
        $(this.coordinateElement).show();
        $(this.userCountElement).show();

        this.getCanvasImage();

        this.changeUserCount(null);
        this.loadUserCount().then((online) => {
            this.userCountChanged(online);
        }).catch((err) => $(this.userCountElement).hide());

        this.socket = this.startSocketConnection();

        this.popoutController = popoutController;
        this.popoutController.setup(this, $("#popout-container")[0]);
        this.popoutController.popoutVisibilityController.visibilityChangeCallback = () => app.handleResize();

        setInterval(function() { app.doKeys() }, 15);

        this.updateAuthLinks();

        this.dismissBtn = $("<button>").attr("type", "button").addClass("close").attr("data-dismiss", "alert").attr("aria-label", "Close");
        $("<span>").attr("aria-hidden", "true").html("&times;").appendTo(this.dismissBtn);
    },

    getCanvasImage: function() {
        if(this.loadedImage) return;
        var app = this;
        if(!this.isOutdated) this.adjustLoadingScreen("Loading…");;
        this.loadImage().then((image) => {
            app.adjustLoadingScreen();
            app.canvasController.clearCanvas();
            app.canvasController.drawImage(image);
            app.updateDisplayCanvas();
            app.displayCtx.imageSmoothingEnabled = false;
            app.loadedImage = true;
        }).catch((err) => {
            console.error("Error loading board image", err);
            if(typeof err.status !== "undefined" && err.status === 503) {
                app.adjustLoadingScreen("Waiting for server…");
                console.log("Server wants us to await its instruction");
                setTimeout(function() {
                    app.getCanvasImage()
                }, 15000);
            } else {
                app.adjustLoadingScreen("An error occurred. Please wait…");
                setTimeout(function() {
                    app.getCanvasImage()
                }, 5000);
            }
        });
    },

    loadImage: function() {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/board-image", true);
            xhr.responseType = "blob";
            xhr.onload = function(e) {
                if(xhr.status == 200) {
                    var url = URL.createObjectURL(this.response);
                    var img = new Image();
                    img.onload = function() {
                        URL.revokeObjectURL(this.src);
                        resolve(img);
                    };
                    img.onerror = () => reject(xhr);
                    img.src = url;
                } else reject(xhr);
            };
            xhr.onerror = () => reject(xhr);
            xhr.send();
        });
    },

    setupInteraction: function() {
        var app = this;
        interact(this.cameraController).draggable({
            inertia: true,
            restrict: {
                restriction: "parent",
                elementRect: { top: 0.5, left: 0.5, bottom: 0.5, right: 0.5 },
                endOnly: true
            },
            autoScroll: true,
            onstart: (event) => {
                if(event.interaction.downEvent.button == 2 || app.isViewingFullMap()) return event.preventDefault();
                $(app.zoomController).addClass("grabbing");
                $(":focus").blur();
            },
            onmove: (event) => {
                if(app.isViewingFullMap()) return event.preventDefault();
                app.moveCamera(event.dx, event.dy)
            },
            onend: (event) => {
                if(event.interaction.downEvent.button == 2 || app.isViewingFullMap()) return event.preventDefault();
                $(app.zoomController).removeClass("grabbing");
                var coord = app.getCoordinates();
                app.hashHandler.modifyHash(coord);
                app.updateAuthLinks();
            }
        }).on("tap", (event) => {
            if(event.interaction.downEvent.button == 2 || app.isViewingFullMap()) return event.preventDefault();
            if(!this.zooming.zooming) {
                let zoom = app._getZoomMultiplier();
                app.canvasClicked(Math.round((event.pageX - $(app.cameraController).offset().left) / zoom), Math.round((event.pageY - $(app.cameraController).offset().top) / zoom));
            }
            event.preventDefault();
        }).on("doubletap", (event) => {
            if(app.isViewingFullMap()) return event.preventDefault();
            if(app.zooming.zoomedIn && this.selectedColour === null) {
                app.zoomFinished();
                app.shouldShowPopover = false;
                app.setZoomedIn(false);
                event.preventDefault();
            }
        });
    },

    loadUserCount: function() {
        return new Promise((resolve, reject) => {
            $.get("/api/online").done((data) => {
                if(data.success && !!data.online) return resolve(data.online.count);
                reject();
            }).fail((err) => reject(err));
        });
    },

    getSpawnPoint: function() {
        let point = this.getHashPoint();
        if (point) return point;
        return this.getRandomSpawnPoint();
    },

    getHashPoint: function() {
        let hash = this.hashHandler.getHash();
        if(typeof hash.x !== "undefined" && typeof hash.y !== "undefined") {
            var x = parseInt(hash.x), y = parseInt(hash.y);
            var fixed = this.closestInsideCoordinates(x, y);
            if(x !== null && y !== null && !isNaN(x) && !isNaN(y)) return {x: -fixed.x + (size / 2), y: -fixed.y + (size / 2)};
        }
        return null;
    },

    handleHashChange: function() {
        var point = this.getHashPoint();
        if (point) this.setCanvasPosition(point.x, point.y);
    },

    startSocketConnection: function() {
        var socket = io();

        socket.onJSON = function(event, listener) {
            return this.on(event, (data) => listener(JSON.parse(data)));
        }

        socket.on("error", (e) => {
            console.error("Socket error (will reload pixels on reconnect to socket): " + e);
            this.isOutdated = true;
        });
        socket.on("disconnect", () => {
            console.warn("Socket disconnected from server, remembering to reload pixels on reconnect.")
            this.isOutdated = true
        });
        socket.on("connect", () => {
            console.log("Socket successfully connected");
            if(this.isOutdated) {
                this.loadedImage = false;
                this.getCanvasImage();
                this.isOutdated = false;
            }
        });

        socket.onJSON("tile_placed", this.liveUpdateTile.bind(this));
        socket.on("server_ready", () => this.getCanvasImage());
        socket.on("user_change", this.userCountChanged.bind(this));
        socket.onJSON("admin_broadcast", this.adminBroadcastReceived.bind(this));
        socket.on("reload_client", () => window.location.reload());
        return socket;
    },

    getRandomSpawnPoint: function() {
        function getRandomTileNumber() {
            return Math.random() * size - (size / 2);
        }
        return {x: getRandomTileNumber(), y: getRandomTileNumber()};
    },

    liveUpdateTile: function (data) {
        this.popoutController.loadActiveUsers();
        this.setPixel(`rgb(${data.colour.r}, ${data.colour.g}, ${data.colour.b})`, data.x, data.y);
    },

    adminBroadcastReceived: function(data) {
        this.showAdminBroadcast(data.title, data.message, data.style || "info", data.timeout || 0);
    },

    userCountChanged: function (data) {
        if(data) this.changeUserCount(data);
    },

    setupColours: function() {
        $(this.colourPaletteElement).remove(".colour-option");
        this.colourPaletteOptionElements = [];
        this.DEFAULT_COLOURS.forEach((colour, index) => {
            let elem = $("<div class=\"colour-option" + (colour.toLowerCase() == "#ffffff" ? " is-white" : "") + "\" style=\"background-color: " + colour + ";\" data-colour=\"" + (index + 1) + "\"></div>").appendTo(this.colourPaletteElement)[0];
            this.colourPaletteOptionElements.push(elem);
        });
    },

    handleResize: function() {
        var canvasContainer = $(this.zoomController).parent();
        this.displayCanvas.height = canvasContainer.height();
        this.displayCanvas.width = canvasContainer.width();
        this.displayCtx.mozImageSmoothingEnabled = false;
        this.displayCtx.webkitImageSmoothingEnabled = false;
        this.displayCtx.msImageSmoothingEnabled = false;
        this.displayCtx.imageSmoothingEnabled = false;
        this.updateDisplayCanvas();
        this.updateGrid();
        this.updateGridHint(this.lastX, this.lastY);
        this.setFullMapViewScale();
    },

    setFullMapViewScale: function() {
        var scale = 1;
        if(this.isViewingFullMap()) {
            var canvasContainer = $(this.zoomController).parent();
            var scale = Math.min(1, Math.min(canvasContainer.height() / size, canvasContainer.width() / size));
        }
        $(this.canvas).css({ "transform": `scale(${scale}, ${scale})` });
    },

    setupDisplayCanvas: function(canvas) {
        this.displayCtx = canvas.getContext("2d");
        this.handleResize();
        this.updateDisplayCanvas();
    },

    updateDisplayCanvas: function() {
        let dcanvas = this.displayCanvas;
        this.displayCtx.clearRect(0, 0, dcanvas.width, dcanvas.height);
        let zoom = this._getCurrentZoom();
        let mod = size / 2;
        this.displayCtx.drawImage(this.canvas, dcanvas.width / 2 + (this.panX - mod - 0.5) * zoom, dcanvas.height / 2 + (this.panY - mod - 0.5) * zoom, this.canvas.width * zoom, this.canvas.height * zoom);
    },

    _lerp: function(from, to, time) {
        if (time > 100) time = 100
        return from + (time / 100) * (to - from)
    },

    _getCurrentZoom: function() {
        if (!this.zooming.zooming) return this._getZoomMultiplier()
        return this._lerp(this.zooming.zoomFrom, this.zooming.zoomTo, this.zooming.zoomTime)
    },

    _getZoomMultiplier: function() {
        return this.zooming.zoomedIn ? 40 : 4;
    },

    animateZoom: function(callback = null) {
        this.zooming.zoomTime += this.zooming.fastZoom ? 5 : 1

        let x = this._lerp(this.zooming.panFromX, this.zooming.panToX, this.zooming.zoomTime);
        let y = this._lerp(this.zooming.panFromY, this.zooming.panToY, this.zooming.zoomTime);
        this.setCanvasPosition(x, y)

        if (this.zooming.zoomTime >= 100) {
            this.zoomFinished();
            if(this.shouldShowPopover) {
                $(this.pixelDataPopover).fadeIn(250);
                this.shouldShowPopover = false;
            }
            if(callback) callback();
            return
        }
    },

    zoomFinished: function() {
        this.zooming.zooming = false;
        this.setCanvasPosition(this.zooming.panToX, this.zooming.panToY);
        this.zooming.panToX = null, this.zooming.panToY = null;
        clearInterval(this.zooming.zoomHandle);
        let coord = this.getCoordinates();
        this.hashHandler.modifyHash(coord);
        this.updateAuthLinks();
        this.zooming.zoomHandle = null;
        this.zooming.fastZoom = false;
    },

    setZoomedIn: function(zoomedIn) {
        var app = this;
        if(this.zooming.zoomHandle !== null) return;
        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;
        if(this.zooming.panToX == null) this.zooming.panToX = this.panX;
        if(this.zooming.panToY == null) this.zooming.panToY = this.panY;
        this.zooming.zoomFrom = this._getCurrentZoom()
        this.zooming.zoomTime = 0
        this.zooming.zooming = true
        this.zooming.zoomedIn = zoomedIn;
        this.zooming.zoomTo = this._getZoomMultiplier()
        this.zooming.zoomHandle = setInterval(this.animateZoom.bind(this, function() {
            $(app.grid).removeClass("zooming");
        }), 1);

        if (zoomedIn) $(this.zoomController).parent().addClass("zoomed");
        else $(this.zoomController).parent().removeClass("zoomed");
        $(this.grid).addClass("zooming");
        this.updateDisplayCanvas();
        this._adjustZoomButtonText();
    },

    toggleZoom: function() {
        this.setZoomedIn(!this.zooming.zoomedIn);
    },

    _adjustZoomButtonText: function() {
        if (this.zoomButton) $(this.zoomButton).html(`<i class="fa fa-fw fa-search-${this.zooming.zoomedIn ? "minus" : "plus"}"></i>`).attr("title", (this.zooming.zoomedIn ? "Zoom Out" : "Zoom In") + " (spacebar)");
    },

    _adjustGridButtonText: function() {
        var gridShown = $(this.grid).hasClass("show");
        if (this.gridButton) $(this.gridButton).html(`<i class="fa fa-fw fa-${gridShown ? "square" : "th"}"></i>`).attr("title", (gridShown ? "Hide Grid" : "Show Grid") + " (G)");
    },

    _adjustFullButtonText: function() {
        var isInFullMode = this.isViewingFullMap();
        if (this.fullMapButton) $(this.fullMapButton).html(`<i class="fa fa-fw fa-${isInFullMode ? "hand-paper" : "picture"}-o"></i>`).attr("title", (isInFullMode ? "Exit Full Map Mode" : "View Full Map") + " (F)");
    },

    setZoomButton: function(btn) {
        this.zoomButton = btn;
        this._adjustZoomButtonText();
        $(btn).click(this.toggleZoom.bind(this));
    },

    setGridButton: function(btn) {
        this.gridButton = btn;
        this._adjustGridButtonText();
        $(btn).click(this.toggleGrid.bind(this));
    },

    setFullMapButton: function(btn) {
        this.fullMapButton = btn;
        this._adjustFullButtonText();
        $(btn).click(this.toggleViewingFullMap.bind(this));
    },

    setCoordinatesButton: function(btn) {
        if(Clipboard.isSupported()) {
            var app = this;
            var clipboard = new Clipboard(btn);
            $(btn).addClass("clickable").tooltip({
                title: "Copied to clipboard!",
                trigger: "manual",
            });
            clipboard.on("success", function(e) {
                $(btn).tooltip("show");
                setTimeout(function() {
                    $(btn).tooltip("hide");
                }, 2500);
            })
        }
    },

    moveCamera: function(deltaX, deltaY, softAllowBoundPush = true) {
        var cam = $(this.cameraController);
        var zoomModifier = this._getCurrentZoom();
        var coords = this.getCoordinates();
        var x = deltaX / zoomModifier, y = deltaY / zoomModifier;
        this.setCanvasPosition(x, y, true, softAllowBoundPush);
    },

    updateCoordinates: function() {
        var coord = this.getCoordinates();
        if(coord != this.lastUpdatedCoordinates) {
            var coordElem = $(this.coordinateElement);
            setTimeout(function() {
                let spans = coordElem.find("span");
                spans.first().text(coord.x.toLocaleString());
                spans.last().text(coord.y.toLocaleString());
                coordElem.attr("data-clipboard-text", `(${coord.x}, ${coord.y})`);
            }, 0);
        }
        this.lastUpdatedCoordinates = coord;
    },

    isOutsideOfBounds: function(precise = false) {
        var coord = this.getCoordinates();
        var x = coord.x < 0 || coord.x >= size, y = coord.y >= size || coord.y < 0
        return precise ? { x: x, y: y } : x || y;
    },

    getCoordinates: function() {
        let dcanvas = this.canvasController.canvas;
        return {x: Math.floor(-this.panX) + dcanvas.width / 2, y: Math.floor(-this.panY) + dcanvas.height / 2};
    },

    setCanvasPosition: function(x, y, delta = false, softAllowBoundPush = true) {
        $(this.pixelDataPopover).hide();
        if (delta) this.panX += x, this.panY += y;
        else this.panX = x, this.panY = y;
        if(!softAllowBoundPush) {
            this.panX = Math.max(-(size / 2) + 1, Math.min((size / 2), this.panX));
            this.panY = Math.max(-(size / 2) + 1, Math.min((size / 2), this.panY));
        }
        $(this.cameraController).css({
            top: `${this.panY}px`,
            left: `${this.panX}px`
        })
        this.updateGrid();
        this.updateCoordinates();
        this.updateDisplayCanvas();
    },

    updateGrid: function() {
        let zoom = this._getCurrentZoom();
        $(this.grid).css({
            transform: `translate(${(($(this.cameraController).offset().left / zoom) - 0.5) * zoom % zoom}px, ${(($(this.cameraController).offset().top / zoom) - 0.5) * zoom % zoom}px)`,
            backgroundSize: `${zoom}px ${zoom}px`
        })
    },

    toggleGrid: function() {
        $(this.grid).toggleClass("show");
        this._adjustGridButtonText();
    },

    updateGridHint: function(x, y) {
        this.lastX = x;
        this.lastY = y;
        if(this.gridHint) {
            let zoom = this._getCurrentZoom();
            // Hover position in grid multiplied by zoom
            let x = Math.round((this.lastX - $(this.cameraController).offset().left) / zoom), y = Math.round((this.lastY - $(this.cameraController).offset().top) / zoom);
            let elem = $(this.gridHint);
            let posX = x + ($(this.cameraController).offset().left / zoom) - 0.5;
            let posY = y + ($(this.cameraController).offset().top / zoom) - 0.5;
            elem.css({
                left: posX * zoom,
                top: posY * zoom,
            });
        }
    },

    handleMouseMove: function(event) {
        if(!this.placing) {
            this.updateGridHint(event.pageX, event.pageY);
            if(this.handElement) {
                let elem = $(this.handElement);
                elem.css({
                    left: event.pageX - (elem.width() / 2),
                    top: event.pageY - (elem.height() / 2),
                });
            }
        }
    },

    closestInsideCoordinates: function(x, y) {
        return {
            x: Math.max(0, Math.min(x, size - 1)),
            y: Math.max(0, Math.min(y, size - 1))
        };
    },

    contextMenu: function(event) {
        event.preventDefault();
        if(this.selectedColour !== null) return this.deselectColour();
        if(this.zooming.zoomedIn) this.setZoomedIn(false);
    },

    getPixel: function(x, y, callback) {
        function failToPost(error) {
            let defaultError = "An error occurred while trying to retrieve data about that pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
            callback(error);
        }
        return $.get(`/api/pixel?x=${x}&y=${y}`).done((data) => {
            if(!data.success) return failToPost(data.error);
            callback(null, data);
        }).fail((err) => failToPost(err));
    },

    isSignedIn: function() {
        return $("body").hasClass("signed-in");
    },

    updatePlaceTimer: function() {
        if(this.isSignedIn()) {
            this.changePlaceTimerVisibility(true);
            $(this.placeTimer).children("span").text("Loading…");
            var a = this;
            return $.get("/api/timer").done((data) => {
                if(data.success) return a.doTimer(data.timer);
                failToPost(data.error);
            }).fail(() => this.changePlaceTimerVisibility(false));
        }
        this.changePlaceTimerVisibility(false);
    },

    doTimer: function(data) {
        this.changePlaceTimerVisibility(true);
        if(data.canPlace) return this.changePlaceTimerVisibility(false);
        this.deselectColour();
        this.unlockTime = (new Date().getTime() / 1000) + data.seconds;
        this.secondTimer = setInterval(() => this.checkSecondsTimer(), 1000);
        this.checkSecondsTimer();
    },

    checkSecondsTimer: function() {
        function padLeft(str, pad, length) {
            return (new Array(length + 1).join(pad) + str).slice(-length);
        }
        if(this.unlockTime && this.secondTimer) {
            let time = Math.round(this.unlockTime - new Date().getTime() / 1000);
            if(time > 0) {
                let minutes = ~~(time / 60), seconds = time - minutes * 60;
                let formattedTime = `${minutes}:${padLeft(seconds.toString(), "0", 2)}`;
                let shouldShowNotifyButton = !this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission();
                $(this.placeTimer).children("span").html("You may place again in <strong>" + formattedTime + "</strong>." + (shouldShowNotifyButton ? " <a href=\"#\" id=\"notify-me\">Notify me</a>." : ""));
                return;
            } else {
                this.notificationHandler.sendNotification("Place 2.0", "You may now place!");
            }
        }
        if(this.secondTimer) clearInterval(this.secondTimer);
        this.secondTimer = null, this.unlockTime = null;
        this.changePlaceTimerVisibility(false);
    },

    handleNotifyMeClick: function() {
        if(!this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission()) return this.notificationHandler.requestPermission((success) => this.checkSecondsTimer());
        this.checkSecondsTimer();
    },

    changeUserCount: function(newContent) {
        let elem = $(this.userCountElement);
        elem.show();
        let notch = elem.find(".loading");
        let text = elem.find(".count");
        let num = parseInt(newContent);
        if(num === null || isNaN(num)) {
            notch.show();
            text.text("");
        } else {
            notch.hide();
            text.text(num.toLocaleString());
        }
    },

    changePlaceTimerVisibility: function(visible) {
        if(visible) $(this.placeTimer).addClass("shown");
        else $(this.placeTimer).removeClass("shown");
        this.changeSelectorVisibility(!visible);
    },

    changePlacingModalVisibility: function(visible) {
        if(visible) $(this.placingOverlay).addClass("shown");
        else $(this.placingOverlay).removeClass("shown");
    },

    selectColour: function(colourID) {
        if(this.isViewingFullMap()) return;
        this.deselectColour();
        this.selectedColour = colourID - 1;
        let elem = this.colourPaletteOptionElements[this.selectedColour];
        this.handElement = $(elem).clone().addClass("hand").appendTo($(this.zoomController).parent())[0];
        $(this.zoomController).addClass("selected");
        $(this.gridHint).show();
    },

    deselectColour: function() {
        this.selectedColour = null;
        $(this.handElement).remove();
        $(this.zoomController).removeClass("selected");
        $(this.gridHint).hide();
    },

    changeSelectorVisibility: function(visible) {
        if(this.selectedColour == null) return;
        if(visible) {
          let elem = this.colourPaletteOptionElements[this.selectedColour];
          $(this.handElement).show();
          $(this.zoomController).addClass("selected");
          $(this.gridHint).show();
        } else {
          $(this.handElement).hide();
          $(this.zoomController).removeClass("selected");
          $(this.gridHint).hide();
        }
    },

    zoomIntoPoint: function(x, y, actuallyZoom = true) {
        this.zooming.panToX = -(x - size / 2);
        this.zooming.panToY = -(y - size / 2);

        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;

        this.setZoomedIn(actuallyZoom ? true : this.zooming.zoomedIn); // this is lazy as fuck but so am i
    },

    canvasClicked: function(x, y, event) {
        var app = this;
        function getUserInfoTableItem(title, value) {
            var ctn = $("<div>").addClass("field");
            $("<span>").addClass("title").text(title).appendTo(ctn);
            $(`<span>`).addClass("value").html(value).appendTo(ctn);
            return ctn;
        }
        function getUserInfoDateTableItem(title, date) {
            var ctn = getUserInfoTableItem(title, "");
            $("<time>").attr("datetime", date).attr("title", new Date(date).toLocaleString()).text($.timeago(date)).prependTo(ctn.find(".value"));
            return ctn;
        }

        $(this.pixelDataPopover).hide();
        function failToPost(error) {
            let defaultError = "An error occurred while trying to place your pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
        }

        // Don't even try if it's out of bounds
        if (x < 0 || y < 0 || x > this.canvas.width - 1 || y > this.canvas.height - 1) return;

        // Make the user zoom in before placing pixel
        let wasZoomedOut = !this.zooming.zoomedIn;
        if(wasZoomedOut) this.zoomIntoPoint(x, y);

        if(this.selectedColour === null) {
            this.zoomIntoPoint(x, y);
            return this.getPixel(x, y, (err, data) => {
                if(err || !data.pixel) return;
                let popover = $(this.pixelDataPopover);
                if(this.zooming.zooming) this.shouldShowPopover = true;
                else popover.fadeIn(250);
                var hasUser = !!data.pixel.user;
                if(typeof data.pixel.userError === "undefined") data.pixel.userError = null;
                popover.find("#pixel-data-username").text(hasUser ? data.pixel.user.username : this.getUserStateText(data.pixel.userError));
                if(hasUser) popover.find("#pixel-data-username").removeClass("deleted-account");
                else popover.find("#pixel-data-username").addClass("deleted-account");
                popover.find("#pixel-data-time").text($.timeago(data.pixel.modified));
                popover.find("#pixel-data-time").attr("datetime", data.pixel.modified);
                popover.find("#pixel-data-time").attr("title", new Date(data.pixel.modified).toLocaleString());
                popover.find("#pixel-data-x").text(x.toLocaleString());
                popover.find("#pixel-data-y").text(y.toLocaleString());
                if(hasUser) {
                    var userInfoCtn = popover.find(".user-info");
                    userInfoCtn.show();
                    userInfoCtn.find(".field").remove();
                    getUserInfoTableItem("Total pixels placed", data.pixel.user.statistics.totalPlaces.toLocaleString()).appendTo(userInfoCtn);
                    if(data.pixel.user.statistics.placesThisWeek !== null) getUserInfoTableItem("Pixels this week", data.pixel.user.statistics.placesThisWeek.toLocaleString()).appendTo(userInfoCtn);
                    getUserInfoDateTableItem("Account created", data.pixel.user.creationDate).appendTo(userInfoCtn);
                    var latestCtn = getUserInfoDateTableItem("Last placed", data.pixel.user.statistics.lastPlace).appendTo(userInfoCtn);
                    if(data.pixel.user.latestPixel && data.pixel.user.latestPixel.isLatest) {
                        var latest = data.pixel.user.latestPixel;
                        var element = $("<div>")
                        if(data.pixel.point.x == latest.point.x && data.pixel.point.y == latest.point.y) $("<span>").addClass("secondary-info").text("(this pixel)").appendTo(element);
                        else $("<a>").attr("href", "javascript:void(0)").text(`at (${latest.point.x.toLocaleString()}, ${latest.point.y.toLocaleString()})`).click(() => app.zoomIntoPoint(latest.point.x, latest.point.y, false)).appendTo(element);
                        element.appendTo(latestCtn.find(".value"));
                    }
                    popover.find("#pixel-data-username").attr("href", `/user/${data.pixel.user.id}`);
                    var rank = data.pixel.user.statistics.leaderboardRank;
                    if(rank !== null) {
                        popover.find(".rank-container").show();
                        popover.find(".rank-label").removeClass("label-info label-success").addClass(`label-${rank <= 25 ? (rank <= 5 ? "danger" : "success") : "info"}`).text(`Ranked #${rank.toLocaleString()}`);
                        
                    } else popover.find(".rank-container").hide();
                    if (data.pixel.user.admin) popover.find("#pixel-badge").show().text("Admin");
                    else if (data.pixel.user.moderator) popover.find("#pixel-badge").show().text("Moderator");
                    else popover.find("#pixel-badge").hide();
                    if (data.pixel.user.banned) popover.find("#pixel-user-state-badge").show().text("Banned");
                    else if (data.pixel.user.deactivated) popover.find("#pixel-user-state-badge").show().text("Deactivated");
                    else popover.find("#pixel-user-state-badge").hide();
                    popover.find("#user-actions-dropdown-ctn").html(renderUserActionsDropdown(data.pixel.user));
                } else {
                    popover.find(".user-info, #pixel-badge, #pixel-user-state-badge").hide();
                    popover.find("#user-actions-dropdown-ctn").html("");
                    popover.find("#pixel-data-username").removeAttr("href");
                    popover.find(".rank-container").hide();
                }
            });
        }
        if(wasZoomedOut) return;

        var a = this;
        if(this.selectedColour !== null && !this.placing) {
            this.changePlacingModalVisibility(true);
            this.placing = true;
            $.post("/api/place", {
                x: x, y: y, colour: this.selectedColour
            }).done((data) => {
                if(data.success) {
                    this.popoutController.loadActiveUsers();
                    a.setPixel(a.DEFAULT_COLOURS[a.selectedColour], x, y);
                    a.changeSelectorVisibility(false);
                    if(data.timer) a.doTimer(data.timer);
                    else a.updatePlaceTimer();
                } else failToPost(data.error);
            }).fail((data) => failToPost(data.responseJSON.error)).always(() => {
                this.changePlacingModalVisibility(false);
                this.placing = false;
            });
        }
    },

    setPixel: function(colour, x, y) {
        this.canvasController.setPixel(colour, x, y);
        this.updateDisplayCanvas();
    },

    doKeys: function() {
        var keys = Object.keys(this.keys).filter((key) => this.keys[key].filter((keyCode) => this.keyStates[keyCode] === true).length > 0);
        if(keys.indexOf("up") > -1) this.moveCamera(0, 5, false);
        if(keys.indexOf("down") > -1) this.moveCamera(0, -5, false);
        if(keys.indexOf("left") > -1) this.moveCamera(5, 0, false);
        if(keys.indexOf("right") > -1) this.moveCamera(-5, 0, false);
    },

    handleKeyDown: function(keycode) {
        if(keycode == 71) { // G - Grid
            this.toggleGrid();
        } else if(keycode == 32) { // Spacebar - Toggle Zoom
            this.toggleZoom();
        } else if(keycode == 27 && this.selectedColour !== null) { // Esc - Deselect colour
            this.deselectColour();
        } else if(keycode == 70) { // F - toggle full map view
            this.toggleViewingFullMap();
        }
    },

    adjustLoadingScreen: function(text = null) {
        if(text) {
            $("#loading").show().find(".text").text(text);
        } else {
            $("#loading").fadeOut();
        }
    },

    updateAuthLinks: function() {
        var redirectURLPart = encodeURIComponent(window.location.pathname.substr(1) + window.location.search + window.location.hash);
        $("#nav-sign-in > a, #overlay-sign-in").attr("href", `/signin?redirectURL=${redirectURLPart}`)
        $("#nav-sign-up > a, #overlay-sign-up").attr("href", `/signup?redirectURL=${redirectURLPart}`)
        $("#nav-sign-out > a").attr("href", `/signout?redirectURL=${redirectURLPart}`)
    },

    getUserStateText: function(userState) {
        if(userState == "ban") return "Banned user";
        if(userState == "deactivated") return "Deactivated user";
        return "Deleted account";
    },

    showAdminBroadcast(title, message, style, timeout = 0) {
        var alert = $("<div>").addClass("floating-alert admin-alert alert alert-block alert-dismissable").addClass("alert-" + style).hide().prependTo($("#floating-alert-ctn"));
        this.dismissBtn.clone().appendTo(alert);
        var text = $("<p>").text(message).appendTo(alert);
        if(title != null && title != "") {
            $("<span>").text(" ").prependTo(text);
            $("<strong>").text(title).prependTo(text);
        }
        alert.fadeIn(400, function() {
            if(timeout > 0) {
                setTimeout(function() {
                    alert.fadeOut(400, function() { alert.remove(); });
                }, timeout * 1000);
            }
        });
    },

    toggleViewingFullMap: function() {
        this.deselectColour();
        $(this.pixelDataPopover).hide();
        $("body").toggleClass("viewing-full-map");
        this.setFullMapViewScale();
        this._adjustFullButtonText();
    },

    isViewingFullMap: function() {
        return $("body").hasClass("viewing-full-map");
    }
};

place.start($("canvas#place-canvas-draw")[0], $("#zoom-controller")[0], $("#camera-controller")[0], $("canvas#place-canvas")[0], $("#palette")[0], $("#coordinates")[0], $("#user-count")[0], $("#grid-hint")[0], $("#pixel-data-ctn")[0], $("#grid")[0]);
place.setZoomButton($("#zoom-button")[0]);
place.setGridButton($("#grid-button")[0]);
place.setFullMapButton($("#full-map-button")[0]);
place.setCoordinatesButton($("#coordinates")[0]);

$(".popout-control").click(function() {
    place.popoutController.popoutVisibilityController.open();
    place.popoutController.popoutVisibilityController.changeTab($(this).data("tab-name"));
})

$("#user-count").click(function() {
    place.popoutController.popoutVisibilityController.open();
    place.popoutController.popoutVisibilityController.changeTab("active-users");
})
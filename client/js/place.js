//
//  Place.js
//  -----------
//  Written by AppleBetas and nullpixel. Inspired by Reddit's /r/place.
//

var size = 1000;
var enableSuperSecretDebugMode = false;

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

    setPixel: function(colour, x, y) {
        this.ctx.fillStyle = colour;
        this.ctx.fillRect(x, y, 1, 1);
        this.isDisplayDirty = true;
    }
};

var notificationHandler = {
    notificationsSupported: "Notification" in window,

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
        Notification.requestPermission(permission => {
            callback(permission === "granted");
        })
    },

    sendNotification: function(title, message, requesting = false) {
        if(!this.notificationsSupported) return;
        let canSend = this.canNotify;
        if(!canSend && !requesting) return;
        if(!canSend) {
            return this.requestPermission(granted => {
                if (granted) this.sendNotification(message, requesting);
            });
        }
        let notification = new Notification(title, {
            body: message
        });
    }
}

var hashHandler = {
    currentHash: null,
    
    getHash: function() {
        if (this.currentHash === null) this.currentHash = this.decodeHash(window.location.hash);
        return this.currentHash;
    },

    setHash: function(hash) {
        window.location.hash = this.encodeHash(hash);
        this.currentHash = hash;
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
        zoomHandle: null
    },
    socket: null,
    zoomButton: null,
    dragStart: null,
    isMouseDown: false, shouldClick: true, placing: false, didSetHash: false, shouldShowPopover: false,
    panX: 0, panY: 0,
    DEFAULT_COLOURS: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],
    selectedColour: null, handElement: null, unlockTime: null, secondTimer: null, lastUpdatedCoordinates: {x: null, y: null},
    notificationHandler: notificationHandler, hashHandler: hashHandler,

    start: function(canvas, zoomController, cameraController, displayCanvas, colourPaletteElement, coordinateElement, userCountElement, gridHint, pixelDataPopover) {
        this.canvas = canvas;
        this.canvasController = canvasController;
        this.canvasController.init(canvas);
        this.displayCanvas = displayCanvas;
        this.setupDisplayCanvas(this.displayCanvas);

        this.coordinateElement = coordinateElement;
        this.userCountElement = userCountElement;
        this.gridHint = gridHint;
        this.pixelDataPopover = pixelDataPopover;

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
        controller.onmousedown = (event) => { if(enableSuperSecretDebugMode) {console.log("Mouse down event listener fired"); console.log(event)} this.handleMouseDown(event || window.event) };
        controller.onmouseup = (event) => this.handleMouseUp(event || window.event);
        controller.onmouseout = (event) => { console.log("Mouse moved out"); this.shouldClick = false; this.handleMouseUp(event || window.event) };
        controller.onmousemove = (event) => {
            if (this.isMouseDown) this.handleMouseDrag(event || window.event);
            this.handleMouseMove(event || window.event);
        }
        controller.addEventListener("touchstart", event => this.handleMouseDown(event.changedTouches[0]));
        controller.addEventListener("touchmove", event => { event.preventDefault(); if (this.isMouseDown) this.handleMouseDrag(event.changedTouches[0]); });
        controller.addEventListener("touchend", event => this.handleMouseUp(event.changedTouches[0]));
        controller.addEventListener("touchcancel", event => this.handleMouseUp(event.changedTouches[0]));
        //canvas.addEventListener("contextmenu", event => this.contextMenu(event));

        window.onresize = () => this.handleResize();
        window.onhashchange = () => this.handleHashChange();

        this.zoomController = zoomController;
        this.cameraController = cameraController;

        let spawnPoint = this.getSpawnPoint();
        this.setCanvasPosition(spawnPoint.x, spawnPoint.y);
        $(this.coordinateElement).show();
        $(this.userCountElement).show();

        this.loadImage().then(image => {
            this.canvasController.clearCanvas();
            this.canvasController.drawImage(image);
            this.updateDisplayCanvas();
            this.displayCtx.imageSmoothingEnabled = false;
        });

        this.changeUserCount(null);
        this.loadUserCount().then(online => {
            this.userCountChanged(online);
        }).catch(err => $(this.userCountElement).hide())

        this.socket = this.startSocketConnection()
    },

    loadUserCount: function() {
        return new Promise((resolve, reject) => {
            $.get("/api/online").done(data => {
                if(data.success && !!data.online) return resolve(data.online);
                reject();
            }).fail(err => reject(err));
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
            let x = parseInt(hash.x), y = parseInt(hash.y);
            if(x !== null && y !== null && !isNaN(x) && !isNaN(y)) return {x: -x + 500, y: -y + 500};
        }
        return null;
    },

    handleHashChange: function() {
        if(this.didSetHash) {
            this.didSetHash = false;
            return;
        }
        let point = this.getHashPoint();
        if (point) this.setCanvasPosition(point.x, point.y);
    },

    startSocketConnection() {
        var socket = io();
        socket.on("error", e => console.log("Socket error: " + e));
        socket.on("connect", () => console.log("Socket successfully connected"));

        socket.on("tile_placed", this.liveUpdateTile.bind(this));
        socket.on("user_change", this.userCountChanged.bind(this));
        return socket;
    },

    getRandomSpawnPoint: function() {
        function getRandomTileNumber() {
            return Math.random() * size - (size / 2);
        }
        return {x: getRandomTileNumber(), y: getRandomTileNumber()};
    },

    liveUpdateTile: function (data) {
        this.setPixel(`rgb(${data.colour.r}, ${data.colour.g}, ${data.colour.b})`, data.x, data.y);
    },

    userCountChanged: function (data) {
        if(data) this.changeUserCount(data.count);
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
        this.displayCanvas.height = window.innerHeight;
        this.displayCanvas.width = window.innerWidth;
        this.displayCtx.mozImageSmoothingEnabled = false;
        this.displayCtx.webkitImageSmoothingEnabled = false;
        this.displayCtx.msImageSmoothingEnabled = false;
        this.displayCtx.imageSmoothingEnabled = false;
        this.updateDisplayCanvas();
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

    loadImage: function() {
        return new Promise((resolve, reject) => {
            var image = new Image();
            image.src = "/api/board-image";
            image.onload = () => {
                resolve(image);
            };
        });
    },

    animateZoom: function() {
        this.zooming.zoomTime += 1

        let x = this._lerp(this.zooming.panFromX, this.zooming.panToX, this.zooming.zoomTime);
        let y = this._lerp(this.zooming.panFromY, this.zooming.panToY, this.zooming.zoomTime);
        this.setCanvasPosition(x, y)

        if (this.zooming.zoomTime >= 100) {
            this.zooming.zooming = false
            this.setCanvasPosition(this.zooming.panToX, this.zooming.panToY);
            this.zooming.panToX = null, this.zooming.panToY = null;
            clearInterval(this.zooming.zoomHandle);
            let coord = this.getCoordinates();
            this.hashHandler.modifyHash(coord);
            this.zooming.zoomHandle = null;
            if(this.shouldShowPopover) {
                $(this.pixelDataPopover).fadeIn(250);
                this.shouldShowPopover = false;
            }
            return
        }
    },

    setZoomedIn: function(zoomedIn) {
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
        this.zooming.zoomHandle = setInterval(this.animateZoom.bind(this), 1)

        if (zoomedIn) $(this.zoomController).parent().addClass("zoomed");
        else $(this.zoomController).parent().removeClass("zoomed");
        this.updateDisplayCanvas();
        this._adjustZoomButtonText();
    },

    toggleZoom: function() {
        this.setZoomedIn(!this.zooming.zoomedIn);
    },

    _adjustZoomButtonText: function() {
        let zoomIcon = `<i class="fa fa-fw fa-search-${this.zooming.zoomedIn ? "minus" : "plus"}"></i>`;
        if (this.zoomButton) $(this.zoomButton).html(zoomIcon + (this.zooming.zoomedIn ? "Zoom Out" : "Zoom In"))
    },

    setZoomButton: function(btn) {
        this.zoomButton = btn;
        this._adjustZoomButtonText();
        $(btn).click(this.handleZoomButtonClick.bind(this));
    },

    handleZoomButtonClick: function() {
        this.toggleZoom();
        this.isMouseDown = false;
    },

    moveCamera: function(deltaX, deltaY, animated) {
        if (typeof animated === "undefined") animated = false;
        let cam = $(this.cameraController);
        let zoomModifier = this._getCurrentZoom();
        let x = deltaX / zoomModifier,
            y = deltaY / zoomModifier;
        this.setCanvasPosition(x, y, true);
    },

    updateCoordinates: function() {
        let coord = this.getCoordinates();
        if(coord != this.lastUpdatedCoordinates) {
            let coordElem = $(this.coordinateElement);
            setTimeout(function() {
                let spans = coordElem.find("span");
                spans.first().text(coord.x.toLocaleString());
                spans.last().text(coord.y.toLocaleString());
            }, 0);
        }
        this.lastUpdatedCoordinates = coord;
    },

    getCoordinates: function() {
        let dcanvas = this.canvasController.canvas;
        return {x: Math.round(-this.panX) + dcanvas.width / 2, y: Math.round(-this.panY) + dcanvas.height / 2};
    },

    setCanvasPosition: function(x, y, delta = false) {
        $(this.pixelDataPopover).hide();
        let deltaStr = delta ? "+=" : ""
        $(this.cameraController).css({
            top: `${deltaStr}${y}px`,
            left: `${deltaStr}${x}px`
        })
        if (delta) this.panX += x, this.panY += y;
        else this.panX = x, this.panY = y;
        this.updateCoordinates();
        this.updateDisplayCanvas();
    },

    handleMouseMove: function(event) {
        if(!this.placing) {
            if(this.gridHint) {
                let zoom = this._getCurrentZoom();
                // Hover position in grid multiplied by zoom
                let x = Math.round((event.pageX - $(this.cameraController).offset().left) / zoom), y = Math.round((event.pageY - $(this.cameraController).offset().top) / zoom);
                let elem = $(this.gridHint);
                let posX = x + ($(this.cameraController).offset().left / zoom) - 0.5;
                let posY = y + ($(this.cameraController).offset().top / zoom) - 0.5;
                elem.css({
                    left: posX * zoom,
                    top: posY * zoom,
                });
            }
            if(this.handElement) {
                let elem = $(this.handElement);
                elem.css({
                    left: event.pageX - (elem.width() / 2),
                    top: event.pageY - (elem.height() / 2),
                });
            }
        }
    },

    handleMouseDown: function(event) {
        if(enableSuperSecretDebugMode) console.log("Mouse down response triggered");
        this.isMouseDown = true;
        $(this.zoomController).addClass("grabbing");
        this.dragStart = { x: event.pageX, y: event.pageY };
    },

    handleMouseDrag: function(event) {
        if (event.pageX !== this.dragStart.x || event.pageY !== this.dragStart.y) {
            this.shouldClick = false;
            if (this.dragStart) this.moveCamera(event.pageX - this.dragStart.x, event.pageY - this.dragStart.y);
            this.dragStart = { x: event.pageX, y: event.pageY };
        }
    },

    handleMouseUp: function(event) {
        if(enableSuperSecretDebugMode) console.log("Mouse up response triggered")
        if(this.shouldClick) {
            if(enableSuperSecretDebugMode) console.log("Should click on mouse up")
            if(event.target === this.colourPaletteElement || this.colourPaletteOptionElements.indexOf(event.target) >= 0 || event.target == this.zoomButton || !this.shouldClick) return;
            let zoom = this._getZoomMultiplier();
            this.canvasClicked(Math.round((event.pageX - $(this.cameraController).offset().left) / zoom), Math.round((event.pageY - $(this.cameraController).offset().top) / zoom))
        } else if(enableSuperSecretDebugMode) console.log("Was told not to click");
        this.shouldClick = true;
        this.isMouseDown = false;
        $(this.zoomController).removeClass("grabbing");
        this.dragStart = null;
        let coord = this.getCoordinates();
        this.hashHandler.modifyHash(coord);
        this.didSetHash = true;
    },

    /*contextMenu: function(event) {
        event.preventDefault();
    },*/

    getPixel: function(x, y, callback) {
        function failToPost(error) {
            let defaultError = "An error occurred while trying to retrieve data about that pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
            callback(error);
        }
        return $.get(`/api/pixel?x=${x}&y=${y}`).done(data => {
            if(!data.success) return failToPost(data.error);
            callback(null, data);
        }).fail(err => failToPost(err));
    },

    isSignedIn: function() {
        return $("body").hasClass("signed-in");
    },

    updatePlaceTimer: function() {
        if(this.isSignedIn()) {
            this.changePlaceTimerVisibility(true);
            $(this.placeTimer).children("span").text("Loading…");
            var a = this;
            return $.get("/api/timer").done(data => {
                if(data.success) return a.doTimer(data.timer);
                failToPost(data.error);
            }).fail(() => this.changePlaceTimerVisibility(false));
        }
        this.changePlaceTimerVisibility(false);
    },

    doTimer: function(data) {
        this.changePlaceTimerVisibility(true);
        if(data.canPlace) return this.changePlaceTimerVisibility(false);
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
        if(!this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission()) return this.notificationHandler.requestPermission(success => this.checkSecondsTimer());
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
    },

    changePlacingModalVisibility: function(visible) {
        if(visible) $(this.placingOverlay).addClass("shown");
        else $(this.placingOverlay).removeClass("shown");
    },

    selectColour: function(colourID) {
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

    zoomIntoPoint: function(x, y) {
        this.zooming.panToX = -(x - size / 2);
        this.zooming.panToY = -(y - size / 2);

        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;

        this.setZoomedIn(true);
    },

    canvasClicked: function(x, y, event) {
        if(enableSuperSecretDebugMode) console.log("Canvas clicked function called");
        $(this.pixelDataPopover).hide();
        function failToPost(error) {
            let defaultError = "An error occurred while trying to place your pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
        }

        // Don't even try if it's out of bounds
        if (x < 0 || y < 0 || x > this.canvas.width - 1 || y > this.canvas.height - 1) return;

        // Make the user zoom in before placing pixel
        let wasZoomedOut = !this.zooming.zoomedIn;
        if(wasZoomedOut && enableSuperSecretDebugMode) console.log("user was zoomed out, not trying to place")
        if(wasZoomedOut) this.zoomIntoPoint(x, y);

        if(this.selectedColour === null) {
            if(enableSuperSecretDebugMode) console.log("No colour selected, get popover")
            this.zoomIntoPoint(x, y);
            return this.getPixel(x, y, (err, data) => {
                if(err || !data.pixel) return;
                let popover = $(this.pixelDataPopover);
                if(this.zooming.zooming) this.shouldShowPopover = true;
                else popover.fadeIn(250);
                // TODO: account for deleted users
                let hasUser = !!data.pixel.editor;
                popover.find("#pixel-data-username").text(hasUser ? data.pixel.editor.username : "Deleted account");
                if(hasUser) popover.find("#pixel-data-username").removeClass("deleted-account")
                else popover.find("#pixel-data-username").addClass("deleted-account");
                popover.find("#pixel-data-time").text($.timeago(data.pixel.modified));
                popover.find("#pixel-data-time").attr("datetime", data.pixel.modified);
                popover.find("#pixel-data-time").attr("title", new Date(data.pixel.modified).toLocaleString());
                popover.find("#pixel-data-x").text(x.toLocaleString());
                popover.find("#pixel-data-y").text(y.toLocaleString());
                if(hasUser) {
                    popover.find(".user-info").show();
                    popover.find("#pixel-data-user-tile-count").text(data.pixel.editor.statistics.totalPlaces.toLocaleString());
                    popover.find("#pixel-data-user-account-date").text($.timeago(data.pixel.editor.creationDate));
                    popover.find("#pixel-data-user-account-date").attr("datetime", data.pixel.editor.creationDate);
                    popover.find("#pixel-data-user-account-date").attr("title", new Date(data.pixel.editor.creationDate).toLocaleString());
                    popover.find("#pixel-data-user-last-place").text($.timeago(data.pixel.editor.statistics.lastPlace));
                    popover.find("#pixel-data-user-last-place").attr("datetime", data.pixel.editor.statistics.lastPlace);
                    popover.find("#pixel-data-user-last-place").attr("title", new Date(data.pixel.editor.statistics.lastPlace).toLocaleString());
                } else {
                    popover.find(".user-info").hide();
                }
            });
        }
        if(wasZoomedOut) return;

        var a = this;
        if(enableSuperSecretDebugMode) console.log("Got past stage one checks")
        if(this.selectedColour !== null && !this.placing) {
            if(enableSuperSecretDebugMode) console.log("We have a colour and are not currently requesting a tile place, making request now");
            this.changePlacingModalVisibility(true);
            this.placing = true;
            $.post("/api/place", {
                x: x, y: y, colour: this.selectedColour
            }).done(data => {
                if(enableSuperSecretDebugMode) console.log("Retrieved place data back from server:");
                if(enableSuperSecretDebugMode) console.log(data);
                if(data.success) {
                    a.setPixel(a.DEFAULT_COLOURS[a.selectedColour], x, y);
                    a.deselectColour();
                    if(data.timer) a.doTimer(data.timer);
                    else a.updatePlaceTimer();
                } else failToPost(data.error);
            }).fail(data => failToPost(data.responseJSON.error)).always(() => {
                if(enableSuperSecretDebugMode) console.log("Request completed");
                this.changePlacingModalVisibility(false);
                this.placing = false;
            });
        }
    },

    setPixel: function(colour, x, y) {
        this.canvasController.setPixel(colour, x, y);
        this.updateDisplayCanvas();
    }
}

place.start($("canvas#place-canvas-draw")[0], $("#zoom-controller")[0], $("#camera-controller")[0], $("canvas#place-canvas")[0], $("#palette")[0], $("#coordinates")[0], $("#user-count")[0], $("#grid-hint")[0], $("#pixel-data-ctn")[0]);
place.setZoomButton($("#zoom-button")[0]);

"use strict";

//
//  Place.js
//  -----------
//  Written by AppleBetas and nullpixel. Inspired by Reddit's /r/place.
//

var size = 1000;

var canvasController = {
    isDisplayDirty: false,

    init: function init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        // Disable image smoothing
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;
    },

    clearCanvas: function clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isDisplayDirty = true;
    },

    drawImage: function drawImage(image) {
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
        this.isDisplayDirty = true;
    },

    setPixel: function setPixel(colour, x, y) {
        this.ctx.fillStyle = colour;
        this.ctx.fillRect(x, y, 1, 1);
        this.isDisplayDirty = true;
    }
};

var notificationHandler = {
    notificationsSupported: "Notification" in window,

    canNotify: function canNotify() {
        return Notification.permission == "granted";
    },

    isAbleToRequestPermission: function isAbleToRequestPermission() {
        if (!this.notificationsSupported) return false;
        return Notification.permission !== "denied" || Notification.permission === "default";
    },

    requestPermission: function requestPermission(callback) {
        if (!this.isAbleToRequestPermission || !this.notificationsSupported) return callback(false);
        Notification.requestPermission(function (permission) {
            callback(permission === "granted");
        });
    },

    sendNotification: function sendNotification(title, message) {
        var _this = this;

        var requesting = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        if (!this.notificationsSupported) return;
        var canSend = this.canNotify;
        if (!canSend && !requesting) return;
        if (!canSend) {
            return this.requestPermission(function (granted) {
                if (granted) _this.sendNotification(message, requesting);
            });
        }
        var notification = new Notification(title, {
            body: message
        });
    }
};

var hashHandler = {
    getHash: function getHash() {
        return this.decodeHash(window.location.hash);
    },

    setHash: function setHash(hash) {
        window.location.hash = this.encodeHash(hash);
    },

    modifyHash: function modifyHash(newHash) {
        var hash = this.getHash();
        Object.keys(newHash).forEach(function (key) {
            var value = newHash[key];
            hash[key] = value;
        });
        this.setHash(hash);
    },

    decodeHash: function decodeHash(hashString) {
        if (hashString.indexOf("#") === 0) hashString = hashString.substring(1);
        if (hashString.length <= 0) return {};
        var hashArguments = hashString.split("&");
        var decoded = {};
        hashArguments.forEach(function (hashArg) {
            var parts = hashArg.split("=");
            var key = parts[0],
                value = parts[1];
            if (key) decoded[key] = value;
        });
        return decoded;
    },

    encodeHash: function encodeHash(hash) {
        var parts = [];
        Object.keys(hash).forEach(function (key) {
            var value = hash[key];
            parts.push(key + "=" + value);
        });
        return parts.join("&");
    }
};

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
    isMouseDown: false, shouldClick: true, placing: false, didSetHash: false,
    panX: 0, panY: 0,
    DEFAULT_COLOURS: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],
    selectedColour: null, handElement: null, unlockTime: null, secondTimer: null, lastUpdatedCoordinates: { x: null, y: null },
    notificationHandler: notificationHandler, hashHandler: hashHandler,

    start: function start(canvas, zoomController, cameraController, displayCanvas, colourPaletteElement, coordinateElement, userCountElement) {
        var _this2 = this;

        this.canvas = canvas;
        this.canvasController = canvasController;
        this.canvasController.init(canvas);
        this.displayCanvas = displayCanvas;
        this.setupDisplayCanvas(this.displayCanvas);

        this.coordinateElement = coordinateElement;
        this.userCountElement = userCountElement;

        this.colourPaletteElement = colourPaletteElement;
        this.setupColours();
        this.placingOverlay = $(this.colourPaletteElement).children("#placing-modal");
        this.placeTimer = $(this.colourPaletteElement).children("#place-timer");
        $(this.placeTimer).on("click", "#notify-me", function () {
            return _this2.handleNotifyMeClick();
        });
        var app = this;
        $(this.colourPaletteElement).on("click", ".colour-option", function () {
            var colourID = parseInt($(this).data("colour"));
            if (colourID) app.selectColour(colourID);
        });
        $(this.colourPaletteElement).click(function (e) {
            if (e.target !== this) return;
            app.deselectColour();
        });
        this.updatePlaceTimer();

        var controller = $(zoomController).parent()[0];
        controller.onmousedown = function (event) {
            return _this2.handleMouseDown(event || window.event);
        };
        controller.onmouseup = function (event) {
            return _this2.handleMouseUp(event || window.event);
        };
        controller.onmouseout = function (event) {
            _this2.shouldClick = false;_this2.handleMouseUp(event || window.event);
        };
        controller.onmousemove = function (event) {
            if (_this2.isMouseDown) _this2.handleMouseDrag(event || window.event);
            _this2.handleMouseMove(event || window.event);
        };
        controller.addEventListener("touchstart", function (event) {
            return _this2.handleMouseDown(event.changedTouches[0]);
        });
        controller.addEventListener("touchmove", function (event) {
            event.preventDefault();if (_this2.isMouseDown) _this2.handleMouseDrag(event.changedTouches[0]);
        });
        controller.addEventListener("touchend", function (event) {
            return _this2.handleMouseUp(event.changedTouches[0]);
        });
        controller.addEventListener("touchcancel", function (event) {
            return _this2.handleMouseUp(event.changedTouches[0]);
        });

        window.onresize = function () {
            return _this2.handleResize();
        };
        window.onhashchange = function () {
            return _this2.handleHashChange();
        };

        this.zoomController = zoomController;
        this.cameraController = cameraController;

        var spawnPoint = this.getSpawnPoint();
        this.setCanvasPosition(spawnPoint.x, spawnPoint.y);
        $(this.coordinateElement).show();

        console.log(this.loadImage());
        this.loadImage().then(function (image) {
            console.log("LOADED");
            console.log(_this2);
            _this2.canvasController.clearCanvas();
            _this2.canvasController.drawImage(image);
            _this2.updateDisplayCanvas();
            _this2.displayCtx.imageSmoothingEnabled = false;
        });

        this.socket = this.startSocketConnection();
    },

    getSpawnPoint: function getSpawnPoint() {
        var point = this.getHashPoint();
        if (point) return point;
        return this.getRandomSpawnPoint();
    },

    getHashPoint: function getHashPoint() {
        var hash = this.hashHandler.getHash();
        if (typeof hash.x !== "undefined" && typeof hash.y !== "undefined") {
            var x = parseInt(hash.x),
                y = parseInt(hash.y);
            if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) return { x: -x + 500, y: -y + 500 };
        }
        return null;
    },

    handleHashChange: function handleHashChange() {
        if (this.didSetHash) {
            this.didSetHash = false;
            return;
        }
        var point = this.getHashPoint();
        if (point) this.setCanvasPosition(point.x, point.y);
    },

    startSocketConnection: function startSocketConnection() {
        var socket = io();
        socket.on("error", function (e) {
            return console.log("socket error: " + e);
        });
        socket.on("connect", function () {
            return console.log("socket successfully connected");
        });

        socket.on("tile_placed", this.liveUpdateTile.bind(this));
        return socket;
    },


    getRandomSpawnPoint: function getRandomSpawnPoint() {
        function getRandomTileNumber() {
            return Math.random() * size - size / 2;
        }
        return { x: getRandomTileNumber(), y: getRandomTileNumber() };
    },

    liveUpdateTile: function liveUpdateTile(data) {
        this.setPixel("rgb(" + data.colour.r + ", " + data.colour.g + ", " + data.colour.b + ")", data.x, data.y);
    },

    setupColours: function setupColours() {
        var _this3 = this;

        $(this.colourPaletteElement).remove(".colour-option");
        this.colourPaletteOptionElements = [];
        this.DEFAULT_COLOURS.forEach(function (colour, index) {
            var elem = $("<div class=\"colour-option" + (colour.toLowerCase() == "#ffffff" ? " is-white" : "") + "\" style=\"background-color: " + colour + ";\" data-colour=\"" + (index + 1) + "\"></div>").appendTo(_this3.colourPaletteElement)[0];
            _this3.colourPaletteOptionElements.push(elem);
        });
    },

    handleResize: function handleResize() {
        this.displayCanvas.height = window.innerHeight;
        this.displayCanvas.width = window.innerWidth;
        this.displayCtx.mozImageSmoothingEnabled = false;
        this.displayCtx.webkitImageSmoothingEnabled = false;
        this.displayCtx.msImageSmoothingEnabled = false;
        this.displayCtx.imageSmoothingEnabled = false;
        this.updateDisplayCanvas();
    },

    setupDisplayCanvas: function setupDisplayCanvas(canvas) {
        this.displayCtx = canvas.getContext("2d");
        this.handleResize();
        this.updateDisplayCanvas();
    },

    updateDisplayCanvas: function updateDisplayCanvas() {
        var dcanvas = this.displayCanvas;
        this.displayCtx.clearRect(0, 0, dcanvas.width, dcanvas.height);
        var zoom = this._getCurrentZoom();
        var mod = size / 2;
        this.displayCtx.drawImage(this.canvas, dcanvas.width / 2 + (this.panX - mod - 0.5) * zoom, dcanvas.height / 2 + (this.panY - mod - 0.5) * zoom, this.canvas.width * zoom, this.canvas.height * zoom);
    },

    _lerp: function _lerp(from, to, time) {
        if (time > 100) time = 100;
        return from + time / 100 * (to - from);
    },

    _getCurrentZoom: function _getCurrentZoom() {
        if (!this.zooming.zooming) return this._getZoomMultiplier();
        return this._lerp(this.zooming.zoomFrom, this.zooming.zoomTo, this.zooming.zoomTime);
    },

    _getZoomMultiplier: function _getZoomMultiplier() {
        return this.zooming.zoomedIn ? 40 : 4;
    },

    loadImage: function loadImage() {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.src = "/api/board-image";
            image.onload = function () {
                resolve(image);
            };
        });
    },

    animateZoom: function animateZoom() {
        this.zooming.zoomTime += 1;

        var x = this._lerp(this.zooming.panFromX, this.zooming.panToX, this.zooming.zoomTime);
        var y = this._lerp(this.zooming.panFromY, this.zooming.panToY, this.zooming.zoomTime);
        this.setCanvasPosition(x, y);

        if (this.zooming.zoomTime >= 100) {
            this.zooming.zooming = false;
            this.setCanvasPosition(this.zooming.panToX, this.zooming.panToY);
            this.zooming.panToX = null, this.zooming.panToY = null;
            clearInterval(this.zooming.zoomHandle);
            this.zooming.zoomHandle = null;
            return;
        }
    },

    setZoomedIn: function setZoomedIn(zoomedIn) {
        if (zoomedIn == this.zooming.zoomedIn || this.zooming.zoomHandle !== null) return;
        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;
        if (this.zooming.panToX == null) this.zooming.panToX = this.panX;
        if (this.zooming.panToY == null) this.zooming.panToY = this.panY;
        this.zooming.zoomFrom = this._getCurrentZoom();
        this.zooming.zoomTime = 0;
        this.zooming.zooming = true;
        this.zooming.zoomedIn = zoomedIn;
        this.zooming.zoomTo = this._getZoomMultiplier();
        this.zooming.zoomHandle = setInterval(this.animateZoom.bind(this), 1);

        if (zoomedIn) $(this.zoomController).parent().addClass("zoomed");else $(this.zoomController).parent().removeClass("zoomed");
        this.updateDisplayCanvas();
        this._adjustZoomButtonText();
    },

    toggleZoom: function toggleZoom() {
        this.setZoomedIn(!this.zooming.zoomedIn);
    },

    _adjustZoomButtonText: function _adjustZoomButtonText() {
        var zoomIcon = "<i class=\"fa fa-fw fa-search-" + (this.zooming.zoomedIn ? "minus" : "plus") + "\"></i>";
        if (this.zoomButton) $(this.zoomButton).html(zoomIcon + (this.zooming.zoomedIn ? "Zoom Out" : "Zoom In"));
    },

    setZoomButton: function setZoomButton(btn) {
        this.zoomButton = btn;
        this._adjustZoomButtonText();
        $(btn).click(this.handleZoomButtonClick.bind(this));
    },

    handleZoomButtonClick: function handleZoomButtonClick() {
        this.toggleZoom();
        this.isMouseDown = false;
    },

    moveCamera: function moveCamera(deltaX, deltaY, animated) {
        if (typeof animated === "undefined") animated = false;
        var cam = $(this.cameraController);
        var zoomModifier = this._getCurrentZoom();
        var x = deltaX / zoomModifier,
            y = deltaY / zoomModifier;
        this.setCanvasPosition(x, y, true);
    },

    updateCoordinates: function updateCoordinates() {
        var coord = this.getCoordinates();
        if (coord != this.lastUpdatedCoordinates) {
            var coordElem = $(this.coordinateElement);
            setTimeout(function () {
                var spans = coordElem.find("span");
                spans.first().text(coord.x);
                spans.last().text(coord.y);
            }, 0);
            this.hashHandler.modifyHash(coord);
            this.didSetHash = true;
        }
        this.lastUpdatedCoordinates = coord;
    },

    getCoordinates: function getCoordinates() {
        var dcanvas = this.canvasController.canvas;
        return { x: Math.round(-this.panX) + dcanvas.width / 2, y: Math.round(-this.panY) + dcanvas.height / 2 };
    },

    setCanvasPosition: function setCanvasPosition(x, y) {
        var delta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        var deltaStr = delta ? "+=" : "";
        $(this.cameraController).css({
            top: "" + deltaStr + y + "px",
            left: "" + deltaStr + x + "px"
        });
        if (delta) this.panX += x, this.panY += y;else this.panX = x, this.panY = y;
        this.updateCoordinates();
        this.updateDisplayCanvas();
    },

    handleMouseMove: function handleMouseMove(event) {
        if (this.handElement) {
            var elem = $(this.handElement);
            elem.css({
                left: event.pageX - elem.width() / 2,
                top: event.pageY - elem.height() / 2
            });
        }
    },

    handleMouseDown: function handleMouseDown(event) {
        this.isMouseDown = true;
        $(this.zoomController).addClass("grabbing");
        this.dragStart = { x: event.pageX, y: event.pageY };
    },

    handleMouseDrag: function handleMouseDrag(event) {
        this.shouldClick = false;
        if (this.dragStart) this.moveCamera(event.pageX - this.dragStart.x, event.pageY - this.dragStart.y);
        this.dragStart = { x: event.pageX, y: event.pageY };
    },

    handleMouseUp: function handleMouseUp(event) {
        if (this.shouldClick) {
            if (event.target === this.colourPaletteElement || this.colourPaletteOptionElements.includes(event.target) || event.target == this.zoomButton || !this.shouldClick) return;
            var zoom = this._getZoomMultiplier();
            this.canvasClicked(Math.round((event.pageX - $(this.cameraController).offset().left) / zoom), Math.round((event.pageY - $(this.cameraController).offset().top) / zoom));
        }
        this.shouldClick = true;
        this.isMouseDown = false;
        $(this.zoomController).removeClass("grabbing");
        this.dragStart = null;
    },

    isSignedIn: function isSignedIn() {
        return $("body").hasClass("signed-in");
    },

    updatePlaceTimer: function updatePlaceTimer() {
        var _this4 = this;

        if (this.isSignedIn()) {
            this.changePlaceTimerVisibility(true);
            $(this.placeTimer).children("span").text("Loading…");
            var a = this;
            return $.get("/api/timer").done(function (data) {
                if (data.success) {
                    if (data.timer.canPlace) _this4.changePlaceTimerVisibility(false);else {
                        a.unlockTime = new Date().getTime() / 1000 + data.timer.seconds;
                        a.secondTimer = setInterval(function () {
                            return a.checkSecondsTimer();
                        }, 1000);
                        a.checkSecondsTimer();
                    }
                } else failToPost(data.error);
            }).fail(function () {
                return _this4.changePlaceTimerVisibility(false);
            });
        }
        this.changePlaceTimerVisibility(false);
    },

    checkSecondsTimer: function checkSecondsTimer() {
        function padLeft(str, pad, length) {
            return (new Array(length + 1).join(pad) + str).slice(-length);
        }
        if (this.unlockTime && this.secondTimer) {
            var time = Math.round(this.unlockTime - new Date().getTime() / 1000);
            if (time > 0) {
                var minutes = ~~(time / 60),
                    seconds = time - minutes * 60;
                var formattedTime = minutes + ":" + padLeft(seconds.toString(), "0", 2);
                var shouldShowNotifyButton = !this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission();
                $(this.placeTimer).children("span").html("You may place again in <strong>" + formattedTime + "</strong>." + (shouldShowNotifyButton ? " <a href=\"#\" id=\"notify-me\">Notify me</a>." : ""));
                return;
            } else {
                this.notificationHandler.sendNotification("Place 2.0", "You may now place!");
            }
        }
        if (this.secondTimer) clearInterval(this.secondTimer);
        this.secondTimer = null, this.unlockTime = null;
        this.changePlaceTimerVisibility(false);
    },

    handleNotifyMeClick: function handleNotifyMeClick() {
        var _this5 = this;

        if (!this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission()) return this.notificationHandler.requestPermission(function (success) {
            return _this5.checkSecondsTimer();
        });
        this.checkSecondsTimer();
    },

    changePlaceTimerVisibility: function changePlaceTimerVisibility(visible) {
        if (visible) $(this.placeTimer).addClass("shown");else $(this.placeTimer).removeClass("shown");
    },

    changePlacingModalVisibility: function changePlacingModalVisibility(visible) {
        if (visible) $(this.placingOverlay).addClass("shown");else $(this.placingOverlay).removeClass("shown");
    },

    selectColour: function selectColour(colourID) {
        this.deselectColour();
        this.selectedColour = colourID - 1;
        var elem = this.colourPaletteOptionElements[this.selectedColour];
        this.handElement = $(elem).clone().addClass("hand").appendTo($(this.zoomController).parent())[0];
        $(this.zoomController).addClass("selected");
    },

    deselectColour: function deselectColour() {
        this.selectedColour = null;
        $(this.handElement).remove();
        $(this.zoomController).removeClass("selected");
    },

    zoomIntoPoint: function zoomIntoPoint(x, y) {
        this.zooming.panToX = -(x - size / 2);
        this.zooming.panToY = -(y - size / 2);

        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;

        this.setZoomedIn(true);
    },

    canvasClicked: function canvasClicked(x, y, event) {
        var _this6 = this;

        function failToPost(error) {
            var defaultError = "An error occurred while trying to place your pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
        }

        // Don't even try if it's out of bounds
        if (x < 0 || y < 0 || x > this.canvas.width - 1 || y > this.canvas.height - 1) return;

        // Make the user zoom in before placing pixel
        if (!this.zooming.zoomedIn) return this.zoomIntoPoint(x, y);

        var a = this;
        if (this.selectedColour !== null && !this.placing) {
            this.changePlacingModalVisibility(true);
            this.placing = true;
            $.post("/api/place", {
                x: x, y: y, colour: this.selectedColour
            }).done(function (data) {
                if (data.success) {
                    a.setPixel(a.DEFAULT_COLOURS[a.selectedColour], x, y);
                    a.deselectColour();
                    a.updatePlaceTimer();
                } else failToPost(data.error);
            }).fail(function (data) {
                return failToPost(data.responseJSON.error);
            }).always(function () {
                _this6.changePlacingModalVisibility(false);
                _this6.placing = false;
            });
        }
    },

    setPixel: function setPixel(colour, x, y) {
        this.canvasController.setPixel(colour, x, y);
        this.updateDisplayCanvas();
    }
};

place.start($("canvas#place-canvas-draw")[0], $("#zoom-controller")[0], $("#camera-controller")[0], $("canvas#place-canvas")[0], $("#palette")[0], $("#coordinates")[0], $("#user-count")[0]);
place.setZoomButton($("#zoom-button")[0]);
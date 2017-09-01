//
//  Place.js
//  -----------
//  Written by AppleBetas and nullpixel. Inspired by Reddit's /r/place.
//

var size;

var SignInDialogController = DialogController($("#sign-in-dialog"));
var ChangelogDialogController = DialogController($("#changelog-dialog"));
ChangelogDialogController.dialog.find("#changelog-opt-out").click(function() {
    placeAjax.delete("/api/changelog/missed");
})

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
    },

    getPixelColour: function(x, y) {
        var data = this.ctx.getImageData(x, y, 1, 1).data;
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return componentToHex(data[0]) + componentToHex(data[1]) + componentToHex(data[2]);
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
        var canSend = this.canNotify;
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
    selectedColour: null, handElement: null, unlockTime: null, fullUnlockTime: null, secondTimer: null, lastUpdatedCoordinates: {x: null, y: null}, loadedImage: false,
    notificationHandler: notificationHandler, hashHandler: hashHandler,
    messages: null,
    isOutdated: false, lastPixelUpdate: null,
    colours: null, canPlaceCustomColours: false, hasTriedToFetchAvailability: false, customColour: null,
    cursorX: 0, cursorY: 0,

    start: function(canvas, zoomController, cameraController, displayCanvas, colourPaletteElement, coordinateElement, userCountElement, gridHint, pixelDataPopover, grid) {
        size = canvas.height;
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
        this.placingOverlay = $(this.colourPaletteElement).find("#placing-modal");
        this.placeTimer = $(this.colourPaletteElement).find("#place-timer");
        $(this.placeTimer).on("click", "#notify-me", () => this.handleNotifyMeClick());
        var app = this;
        $(this.colourPaletteElement).on("click", ".colour-option", function() {
            var colourID = parseInt($(this).data("colour"));
            if(colourID) app.selectColour(colourID);
        });
        $(this.colourPaletteElement).click(function(e) {
            if(e.target !== this) return;
            app.deselectColour();
        })
        this.updatePlaceTimer();

        $("#palette-expando").click(this.handlePaletteExpandoClick);

        var controller = $(zoomController).parent()[0];
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
            if(document.activeElement.tagName != "INPUT" && $(".dialog-ctn.show").length <= 0) {
                handleKeyEvents(e);
                app.handleKeyDown(e.keyCode || e.which);
            }
        };
        document.body.onmousemove = function(e) {
            app.cursorX = e.pageX;
            app.cursorY = e.pageY;
        };

        window.onresize = () => this.handleResize();
        window.onhashchange = () => this.handleHashChange();

        this.zoomController = zoomController;
        this.cameraController = cameraController;
        this.setupDisplayCanvas(this.displayCanvas);
        this.setupInteraction();

        var spawnPoint = this.getSpawnPoint();
        this.setCanvasPosition(spawnPoint.x, spawnPoint.y);
        $(this.coordinateElement).show();
        $(this.userCountElement).show();

        this.getCanvasImage();
        
        this.determineFeatureAvailability();

        this.changeUserCount(null);
        this.loadUserCount().then((online) => {
            this.userCountChanged(online);
        }).catch((err) => $(this.userCountElement).hide());

        this.socket = this.startSocketConnection();

        this.popoutController = popoutController;
        this.popoutController.setup(this, $("#popout-container")[0]);
        this.popoutController.popoutVisibilityController.visibilityChangeCallback = () => {
            var start = new Date();
            var interval = setInterval(function() {
                app.handleResize();
                if((new Date() - start) > 250) clearInterval(interval);
            }, 1);
        }

        $("#colour-picker").minicolors({inline: true, format: "hex", letterCase: "uppercase", defaultValue: "#D66668", change: (change) => this.handleColourPaletteChange(change) });
        $("#colour-picker-hex-value").on("input change keydown", function(e) {
            if (e.keyCode && e.keyCode !== 33) return;
            app.handleColourTextChange(e.type === "input");
        });
        // Check canvas size after chat animation
        $(".canvas-container").on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd', () => {
            this.handleResize();
        });

        this.updateColourSelectorPosition();
        $("#colour-picker-popover-ctn").click(function() {
            $("body").removeClass("picker-showing");
        })

        $("#pixel-use-colour-btn").click(function() {
            var colour = $(this).attr("data-represented-colour");
            $("#colour-picker").minicolors("value", "#" + colour);
        })

        setInterval(function() { app.doKeys() }, 15);

        this.dismissBtn = $("<button>").attr("type", "button").addClass("close").attr("data-dismiss", "alert").attr("aria-label", "Close");
        $("<span>").attr("aria-hidden", "true").html("&times;").appendTo(this.dismissBtn);

        this.loadWarps();
        this.layoutTemplates();
    },

    handleColourTextChange: function(premature = false) {
        var colour = $("#colour-picker-hex-value").val();
        if(colour.substring(0, 1) != "#") colour = "#" + colour;
        if(colour.length != 7 && (colour.length != 4 || premature)) return;
        $("#colour-picker").minicolors("value", colour);
    },

    determineFeatureAvailability: function() {
        placeAjax.get("/api/feature-availability", null, null).then((data) => {
            this.hasTriedToFetchAvailability = true;
            this.colours = data.availability.colours;
            this.canPlaceCustomColours = data.availability.user && data.availability.user.canPlaceCustomColours;
            this.setupColours();
        }).catch((err) => {
            this.hasTriedToFetchAvailability = true;
            setTimeout(() => this.determineFeatureAvailability(), 2500);
            this.setupColours();
        })
    },

    getCanvasImage: function() {
        if(this.loadedImage) return;
        var app = this;
        this.adjustLoadingScreen("Loading…");;
        this.loadImage().then((image) => {
            app.adjustLoadingScreen();
            app.canvasController.clearCanvas();
            app.canvasController.drawImage(image);
            app.updateDisplayCanvas();
            app.displayCtx.imageSmoothingEnabled = false;
            app.loadedImage = true;
            app.lastPixelUpdate = Date.now() / 1000;
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
        var a = this;
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
                        var lastImageUpdate = xhr.getResponseHeader("X-Place-Last-Update");
                        if(lastImageUpdate) a.requestPixelsAfterDate(lastImageUpdate);
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

    neededPixelDate: null,
    requestPixelsAfterDate: function(date) {
        if(!this.socket.connected) {
            this.neededPixelDate = date;
            this.socket.once("connect", () => {
                this.requestPixelsAfterDate(this.neededPixelDate);
                this.neededPixelDate = null;
            });
            return;
        }
        console.log("Requesting pixels after date " + date + "!");
        this.socket.emit("fetch_pixels", date);
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
            }
        }).on("tap", (event) => {
            if(event.interaction.downEvent.button == 2 || app.isViewingFullMap()) return event.preventDefault();
            if(!this.zooming.zooming) {
                var cursor = app.getCanvasCursorPosition(event.pageX, event.pageY);
                app.canvasClicked(cursor.x, cursor.y);
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

    getCanvasCursorPosition: function(x = null, y = null) {
        var zoom = this._getZoomMultiplier();
        return {x: Math.round(((x ? x : this.cursorX) - $(this.cameraController).offset().left) / zoom), y: Math.round(((y ? y : this.cursorY) - $(this.cameraController).offset().top) / zoom)};
    },

    loadUserCount: function() {
        return new Promise((resolve, reject) => {
            placeAjax.get("/api/online").then((data) => {
                if(!data.online) return reject();
                resolve(data.online.count);
            }).catch((err) => reject(err));
        });
    },

    getSpawnPoint: function() {
        var point = this.getHashPoint();
        if (point) return point;
        return this.getRandomSpawnPoint();
    },

    getHashPoint: function() {
        var hash = this.hashHandler.getHash();
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
            if(!this.isOutdated) return;
            if(Date.now() / 1000 - this.lastPixelUpdate > 60) {
                // 1 minute has passed
                console.log("We'll need to get the entire board image because the last update was over a minute ago.");
                this.loadedImage = false;
                this.getCanvasImage();
                this.isOutdated = false;
            } else {
                console.log("The last request was a minute or less ago, we can just get the changed pixels over websocket.")
                this.requestPixelsAfterDate(this.lastPixelUpdate)
            }
        });

        socket.onJSON("tile_placed", this.liveUpdateTile.bind(this));
        socket.onJSON("tiles_placed", this.liveUpdateTiles.bind(this));
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

    liveUpdateTiles: function(data) {
        if(!data.pixels) return;
        data.pixels.forEach((pixel) => this.liveUpdateTile(pixel));
    },

    liveUpdateTile: function (data) {
        this.lastPixelUpdate = Date.now() / 1000;
        this.setPixel(`#${data.colour}`, data.x, data.y);
    },

    adminBroadcastReceived: function(data) {
        this.showAdminBroadcast(data.title, data.message, data.style || "info", data.timeout || 0);
    },

    userCountChanged: function (data) {
        if(data !== null) this.changeUserCount(data);
    },

    setupColours: function() {
        var overlay = $("#availability-loading-modal");
        $(this.colourPaletteElement).find(".colour-option, .palette-separator").remove();
        var contentContainer = $(this.colourPaletteElement).find("#palette-content-ctn");
        this.colourPaletteOptionElements = [];
        if(this.colours) {
            overlay.hide();
            if(this.canPlaceCustomColours) $("<div>").addClass("colour-option rainbow").attr("id", "customColourChooserOption").click(function() {
                $("body").toggleClass("picker-showing");
                if($("body").hasClass("picker-showing")) $("#colour-picker-hex-value").focus();
            }).append("<div class=\"colour-option transparent\"></div>").appendTo(contentContainer);
            var elem = $("<div>").addClass("colour-option custom").attr("id", "customChosenColourOption").attr("data-colour", 1).hide().appendTo(contentContainer);
            this.colourPaletteOptionElements.push(elem[0]);
            if(this.canPlaceCustomColours) $("<div>").addClass("palette-separator").appendTo(contentContainer);
            this.colours.forEach((colour, index) => {
                var elem = $("<div>").addClass("colour-option" + (colour.toLowerCase() == "#ffffff" ? " is-white" : "")).css("background-color", colour).attr("data-colour", index + 2);
                elem.appendTo(contentContainer);
                this.colourPaletteOptionElements.push(elem[0]);
            });
            this.updateColourSelectorPosition();
        } else {
            overlay.text(this.hasTriedToFetchAvailability ? "An error occurred while loading colours. Retrying…" : "Loading…").show();
        }
    },

    handleColourPaletteChange: function(newColour) {
        if(!this.canPlaceCustomColours) return;
        this.customColour = newColour;
        var elem = $("#customChosenColourOption").show().css("background-color", newColour);
        $("#colour-picker-hex-value").val(newColour.toUpperCase());
        if(newColour.toLowerCase() == "#ffffff") elem.addClass("is-white");
        else elem.removeClass("is-white");
        this.selectColour(1, false);
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
        this.updateColourSelectorPosition();
    },

    updateColourSelectorPosition: function() {
        var elem = $("#colour-picker-popover"), button = $("#customColourChooserOption");
        var position = 20;
        if(button.length > 0) position = Math.max(20, button.offset().left - (elem.outerWidth() / 2) + (button.outerWidth() / 2));
        if(position <= 20) {
            elem.addClass("arrow-left");
            if(button.length > 0) {
                var arrowOffset = button.offset().left - (button.outerWidth() / 2) - 10;
                $("#popover-styling").html(`#colour-picker-popover:after, #colour-picker-popover:before { left: ${arrowOffset}px!important; }`);
            }
            else $("#popover-styling").html("");
        } else {
            elem.removeClass("arrow-left");
            $("#popover-styling").html("");
        }
        elem.css({left: position});
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
        var dcanvas = this.displayCanvas;
        this.displayCtx.clearRect(0, 0, dcanvas.width, dcanvas.height);
        var zoom = this._getCurrentZoom();
        var mod = size / 2;
        this.displayCtx.drawImage(this.canvas, dcanvas.width / 2 + (this.panX - mod - 0.5) * zoom, dcanvas.height / 2 + (this.panY - mod - 0.5) * zoom, this.canvas.width * zoom, this.canvas.height * zoom);
    },

    _lerp: function(from, to, time) {
        if (time > 100) time = 100;
        return from + (time / 100) * (to - from);
    },

    _getCurrentZoom: function() {
        if (!this.zooming.zooming) return this._getZoomMultiplier();
        return this._lerp(this.zooming.zoomFrom, this.zooming.zoomTo, this.zooming.zoomTime);
    },

    _getZoomMultiplier: function() {
        return this.zooming.zoomedIn ? 40 : 4;
    },

    animateZoom: function(callback = null) {
        this.zooming.zoomTime += this.zooming.fastZoom ? 5 : 1

        var x = this._lerp(this.zooming.panFromX, this.zooming.panToX, this.zooming.zoomTime);
        var y = this._lerp(this.zooming.panFromY, this.zooming.panToY, this.zooming.zoomTime);
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
        var coord = this.getCoordinates();
        this.hashHandler.modifyHash(coord);
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
                var spans = coordElem.find("span");
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
        var dcanvas = this.canvasController.canvas;
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
        var zoom = this._getCurrentZoom();
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
            var zoom = this._getCurrentZoom();
            // Hover position in grid multiplied by zoom
            var x = Math.round((this.lastX - $(this.cameraController).offset().left) / zoom), y = Math.round((this.lastY - $(this.cameraController).offset().top) / zoom);
            var elem = $(this.gridHint);
            var posX = x + ($(this.cameraController).offset().left / zoom) - 0.5;
            var posY = y + ($(this.cameraController).offset().top / zoom) - 0.5;
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
                var elem = $(this.handElement);
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
        return placeAjax.get(`/api/pos-info`, {x: x, y: y}, "An error occurred while trying to retrieve data about that pixel.").then((data) => {
            callback(null, data);
        }).catch((err) => callback(err));
    },

    isSignedIn: function() {
        return $("body").hasClass("signed-in");
    },

    updatePlaceTimer: function() {
        if(this.isSignedIn()) {
            this.changePlaceTimerVisibility(true);
            $(this.placeTimer).children("span").text("Loading…");
            var a = this;
            return placeAjax.get("/api/timer").then((data) => a.doTimer(data.timer)).catch((err) => this.changePlaceTimerVisibility(false));
        }
        this.changePlaceTimerVisibility(false);
    },

    doTimer: function(data) {
        this.changePlaceTimerVisibility(true);
        if(data.canPlace) return this.changePlaceTimerVisibility(false);
        this.deselectColour();
        this.unlockTime = (new Date().getTime() / 1000) + data.seconds;
        this.fullUnlockTime = data.seconds;
        this.secondTimer = setInterval(() => this.checkSecondsTimer(), 1000);
        this.checkSecondsTimer();
    },

    getSiteName: function() {
        return $("meta[name=place-site-name]").attr("content");
    },

    checkSecondsTimer: function() {
        function padLeft(str, pad, length) {
            if (str.length > length) return str;
            return (new Array(length + 1).join(pad) + str).slice(-length);
        }
        if(this.unlockTime && this.secondTimer && this.fullUnlockTime) {
            var time = Math.round(this.unlockTime - new Date().getTime() / 1000);
            if(time > 0) {
                var minutes = ~~(time / 60), seconds = time - minutes * 60;
                var formattedTime = `${minutes}:${padLeft(seconds.toString(), "0", 2)}`;
                var shouldShowNotifyButton = !this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission();
                $(this.placeTimer).children("span").html("You may place again in <strong>" + formattedTime + "</strong>." + (shouldShowNotifyButton ? " <a href=\"#\" id=\"notify-me\">Notify me</a>." : ""));
                return;
            } else if(this.fullUnlockTime > 5) { // only notify if full countdown exceeds 5 seconds
                this.notificationHandler.sendNotification(this.getSiteName(), "You may now place!");
            }
        }
        if(this.secondTimer) clearInterval(this.secondTimer);
        this.secondTimer = null, this.unlockTime = null, this.fullUnlockTime = null;
        this.changePlaceTimerVisibility(false);
    },

    handleNotifyMeClick: function() {
        if(!this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission()) return this.notificationHandler.requestPermission((success) => this.checkSecondsTimer());
        this.checkSecondsTimer();
    },

    changeUserCount: function(newContent) {
        var elem = $(this.userCountElement);
        elem.show();
        var notch = elem.find(".loading");
        var text = elem.find(".count");
        var num = parseInt(newContent);
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

    selectColour: function(colourID, hideColourPicker = true) {
        if(this.isViewingFullMap()) return;
        this.deselectColour(hideColourPicker);
        this.selectedColour = colourID - 1;
        var elem = this.colourPaletteOptionElements[this.selectedColour];
        this.handElement = $(elem).clone().addClass("hand").appendTo($(this.zoomController).parent())[0];
        $(elem).addClass("selected");
        $(this.zoomController).addClass("selected");
        $(this.gridHint).show();
    },

    deselectColour: function(hideColourPicker = true) {
        this.selectedColour = null;
        if(hideColourPicker) $("body").removeClass("picker-showing");
        $(this.handElement).remove();
        $(this.colourPaletteOptionElements).removeClass("selected");
        $(this.zoomController).removeClass("selected");
        $(this.gridHint).hide();
    },

    changeSelectorVisibility: function(visible) {
        if(this.selectedColour == null) return;
        if(visible) {
          var elem = this.colourPaletteOptionElements[this.selectedColour];
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

        // Don't even try if it's out of bounds
        if (x < 0 || y < 0 || x > this.canvas.width - 1 || y > this.canvas.height - 1) return;

        // Make the user zoom in before placing pixel
        var wasZoomedOut = !this.zooming.zoomedIn;
        if(wasZoomedOut) this.zoomIntoPoint(x, y);

        if(this.selectedColour === null) {
            this.zoomIntoPoint(x, y);
            return this.getPixel(x, y, (err, data) => {
                if(err || !data.pixel) return;
                var popover = $(this.pixelDataPopover);
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
                popover.find("#pixel-colour-code").text(`#${data.pixel.colour.toUpperCase()}`);
                popover.find("#pixel-colour-preview").css("background-color", `#${data.pixel.colour}`);
                if(data.pixel.colour.toLowerCase() == "ffffff") popover.find("#pixel-colour-preview").addClass("is-white");
                else popover.find("#pixel-colour-preview").removeClass("is-white");
                popover.find("#pixel-use-colour-btn").attr("data-represented-colour", data.pixel.colour);
                if(this.canPlaceCustomColours) popover.find(".pixel-colour").addClass("allow-use");
                else popover.find(".pixel-colour").removeClass("allow-use");
                popover.find(".rank-container > *").remove();
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
                    popover.find("#pixel-data-username").attr("href", `/@${data.pixel.user.username}`);
                    var rankContainer = popover.find(".rank-container");
                    data.pixel.user.badges.forEach((badge) => renderBadge(badge).appendTo(rankContainer));
                    popover.find("#user-actions-dropdown-ctn").html(renderUserActionsDropdown(data.pixel.user));
                } else {
                    popover.find(".user-info, #pixel-badge, #pixel-user-state-badge").hide();
                    popover.find("#user-actions-dropdown-ctn").html("");
                    popover.find("#pixel-data-username").removeAttr("href");
                }
            });
        }
        if(wasZoomedOut) return;
        if(this.selectedColour !== null && !this.placing) {
            this.changePlacingModalVisibility(true);
            var hex = this.getCurrentColourHex();
            this.placing = true;
            placeAjax.post("/api/place", { x: x, y: y, hex: hex }, "An error occurred while trying to place your pixel.", () => {
                this.changePlacingModalVisibility(false);
                this.placing = false;
            }).then((data) => {
                this.popoutController.loadActiveUsers();
                this.setPixel(hex, x, y);
                this.changeSelectorVisibility(false);
                if(data.timer) this.doTimer(data.timer);
                else this.updatePlaceTimer();
            }).catch(() => {});
        }
    },

    getCurrentColourHex: function() {
        if(this.selectedColour <= 0 && this.customColour) return this.customColour;
        return this.colours[this.selectedColour - 1];
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
        } else if(keycode == 80) { // P - pick colour under mouse cursor
            this.pickColourUnderCursor();
        }
    },

    pickColourUnderCursor: function() {
        var cursor = this.getCanvasCursorPosition();
        var colour = this.canvasController.getPixelColour(cursor.x, cursor.y);
        $("#colour-picker").minicolors("value", "#" + colour);
    },

    adjustLoadingScreen: function(text = null) {
        if(text) {
            $("#loading").show().find(".text").text(text);
        } else {
            $("#loading").fadeOut();
        }
    },

    getUserStateText: function(userState) {
        if(userState == "ban") return "Banned user";
        if(userState == "deactivated") return "Deactivated user";
        return "Deleted account";
    },

    showAdminBroadcast: function(title, message, style, timeout = 0) {
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
    },

    handlePaletteExpandoClick: function() {
        var options = {duration: 150, queue: false};
        var expand = $(this).toggleClass("expanded").hasClass("expanded");
        if(expand) $("#menu-content-ctn").slideDown(options);
        else $("#menu-content-ctn").slideUp(options).fadeOut(options);
    },

    loadWarps: function() {
        if(!this.isSignedIn()) return;
        placeAjax.get("/api/warps", null, null).then((response) => {
            this.warps = response.warps;
            this.layoutWarps();
        }).catch((err) => {
            console.error("Couldn't load warps: " + err);
            this.warps = null;
            this.layoutWarps();
        });
    },

    layoutWarps: function() {
        var app = this;
        function getWarpInfo(title = null, detail = null, clickHandler = null, deleteClickHandler = null, add = false) {
            var warpInfo = $("<div>").addClass("warp-info");
            if(title) $("<span>").addClass("warp-title").text(title).appendTo(warpInfo);
            if(detail) $("<span>").addClass("warp-coordinates").text(detail).appendTo(warpInfo);
            if(add) warpInfo.addClass("add").attr("title", "Create a warp at the current position").append("<span class=\"warp-title\"><i class=\"fa fa-plus\"></i></span>");
            else {
                if(typeof deleteClickHandler === "function") $("<div>").addClass("warp-delete").attr("title", `Delete warp '${title}'`).html("<i class=\"fa fa-trash fa-fw\"></i>").click(deleteClickHandler.bind(app, warpInfo)).appendTo(warpInfo);
                warpInfo.attr("title", `Warp to '${title}'`)
            }
            if(clickHandler) warpInfo.click(clickHandler.bind(app, warpInfo));
            return warpInfo;
        }
        var warpsContainer = $("#warps-ctn");
        if(!this.warps) return warpsContainer.text("Couldn't load warps.");
        warpsContainer.html("");
        var warpInfoContainer = $("<div>").addClass("menu-section-content").appendTo($("<div>").addClass("menu-section-content-ctn").appendTo(warpsContainer));
        getWarpInfo(null, null, this.addNewWarpClicked, null, true).appendTo(warpInfoContainer);
        if(this.warps.length > 0) {
            this.warps.forEach((warp) => getWarpInfo(warp.name, `(${warp.location.x.toLocaleString()}, ${warp.location.y.toLocaleString()})`, () => this.zoomIntoPoint(warp.location.x, warp.location.y, false), this.deleteWarpClicked).attr("data-warp-id", warp.id).appendTo(warpInfoContainer));
        } else {
            warpInfoContainer.addClass("empty");
            var explanation = $("<div>").addClass("warp-info explanation").appendTo(warpInfoContainer);
            $("<span>").addClass("warp-title").text("Warps").appendTo(explanation);
            $("<span>").addClass("warp-coordinates").text("Use warps to get around the canvas quickly. Save a position and warp to it later on.").appendTo(explanation);
        }
    },

    addNewWarpClicked: function(elem, event, input = null) {
        var warpTitle = window.prompt(`Enter a title for this warp (at current position):`, input || "");
        if(!warpTitle || warpTitle.length <= 0) return;
        var pos = this.getCoordinates();
        placeAjax.post("/api/warps", {x: pos.x, y: pos.y, name: warpTitle}, "An unknown error occurred while attempting to create your warp.").then((response) => {
            if(response.warp) this.warps.unshift(response.warp);
            this.layoutWarps();
        }).catch((err) => {
            if(err.code == "validation") this.addNewWarpClicked(elem, event, warpTitle);
        });
    },

    deleteWarpClicked: function(elem, event) {
        event.preventDefault();
        event.stopPropagation();
        if(elem.data("deleting") === true) return;
        function setDeletingState(deleting) {
            elem.data("deleting", deleting);
            var icon = elem.find("i");
            if(deleting) icon.addClass("fa-trash").removeClass("fa-spin fa-circle-o-notch");
            else icon.removeClass("fa-trash").addClass("fa-spin fa-circle-o-notch");
        }
        setDeletingState(true);
        var warpID = elem.attr("data-warp-id");
        if(!warpID) return;
        placeAjax.delete("/api/warps/" + warpID, null, "An unknown error occurred while attempting to delete the specified warp.", () => setDeletingState(false)).then((response) => {
            var index = this.warps.map((w) => w.id).indexOf(warpID);
            if(index >= 0) this.warps.splice(index, 1);
            this.layoutWarps();
        }).catch(() => {});
    },

    loadTemplates: function() {
        var templateJSON = localStorage.getItem("templates");
        if(!templateJSON) return this.templates = [];
        this.templates = JSON.parse(templateJSON);
    },

    saveTemplates: function() {
        localStorage.setItem("templates", JSON.stringify(this.templates || []));
    },
    
    layoutTemplates: function() {
        if(!this.templates) this.loadTemplates();
        var templatesContainer = $("#templates-ctn");
        var templateImgs = $("#template-images");
        templatesContainer.html("");
        templateImgs.html("");
        var infoContainer = $("<div>").addClass("menu-section-content").appendTo($("<div>").addClass("menu-section-content-ctn").appendTo(templatesContainer));
        $("<div>").addClass("warp-info template add").html("<span class=\"warp-title\"><i class=\"fa fa-plus\"></i></span>").click(this.addTemplateClicked.bind(this)).appendTo(infoContainer);
        if(this.templates.length > 0) {
            this.templates.forEach((template, index) => {
                var templateCtn = $("<div>").addClass("warp-info template").attr("data-template-id", index).attr("title", "Jump to the position of this template").appendTo(infoContainer);
                templateCtn.click(this.moveToTemplateClicked.bind(this, templateCtn));
                $("<div>").addClass("warp-delete").attr("title", "Delete this template").html("<i class=\"fa fa-trash fa-fw\"></i>").click(this.deleteTemplateClicked.bind(this, templateCtn)).appendTo(templateCtn);
                $("<div>").addClass("warp-jump-to").attr("title", "Move this template to your current position").html("<i class=\"fa fa-map-pin fa-fw\"></i>").click(this.moveTemplateHereClicked.bind(this, templateCtn)).appendTo(templateCtn);
                $("<div>").addClass("warp-visibility").attr("title", "Change the opacity of this template").html("<i class=\"fa fa-eye fa-fw\"></i>").click(this.changeOpacityOfTemplateClicked.bind(this, templateCtn)).appendTo(templateCtn);
                $("<div>").addClass("warp-scale").attr("title", "Change the scale of this template").html("<i class=\"fa fa-expand fa-fw\"></i>").click(this.changeScaleOfTemplateClicked.bind(this, templateCtn)).appendTo(templateCtn);
                $("<div>").addClass("template-img").css("background-image", `url(${template.url})`).appendTo(templateCtn);
                $("<img>").attr("src", template.url).css({top: template.pos.y, left: template.pos.x, transform: `scale(${template.scale}) translateZ(0) translate(-${50 / template.scale}%, -${50 / template.scale}%)`, opacity: template.opacity}).appendTo(templateImgs);
            });

        } else {
            infoContainer.addClass("empty");
            var explanation = $("<div>").addClass("warp-info template explanation").appendTo(infoContainer);
            $("<span>").addClass("warp-title").text("Templates").appendTo(explanation);
            $("<span>").addClass("warp-coordinates").text("Overlay an image on the canvas to use as a guide for your art.").appendTo(explanation);
        }
    },
    
    addTemplateClicked: function() {
        var app = this;
        $("<input>").attr("type", "file").attr("accept", ".png,.jpg,.gif,.jpeg,.webm,.apng,.svg").hide().on("change", function() {
            this.remove();
            if(!this.files || !this.files[0]) return;
            var reader = new FileReader();
            reader.onload = (event) => {
                var dataURI = event.target.result;
                app.templates.push({pos: app.getCoordinates(), url: dataURI, opacity: 0.5, scale: 1});
                app.layoutTemplates();
                app.saveTemplates();
           };
           reader.onerror = (event) => {
               console.error("Error trying to read template image.", event);
               alert("An error occurred while attempting to read your template image.")
           };
           reader.readAsDataURL(this.files[0]);
        }).appendTo($("body")).click();
    },
    
    deleteTemplateClicked: function(elem, event) {
        event.preventDefault();
        event.stopPropagation();
        var index = $(elem).attr("data-template-id");
        if(!index || index < 0) return;
        this.templates.splice(index, 1);
        this.layoutTemplates();
        this.saveTemplates();
    },
    
    moveTemplateHereClicked: function(elem, event) {
        event.preventDefault();
        event.stopPropagation();
        var index = $(elem).attr("data-template-id");
        if(!index || index < 0) return;
        this.templates[index].pos = this.getCoordinates();
        this.layoutTemplates();
        this.saveTemplates();
    },
    
    changeOpacityOfTemplateClicked: function(elem, event) {
        event.preventDefault();
        event.stopPropagation();
        var index = $(elem).attr("data-template-id");
        if(!index || index < 0) return;
        var newOpacity = window.prompt("Enter the new desired opacity for this template (as a percentage):", (this.templates[index].opacity || 0.5) * 100);
        if(!newOpacity) return;
        if(newOpacity > 100 || newOpacity < 0) return window.alert("You must enter a value between 0 and 100.");
        this.templates[index].opacity = newOpacity / 100;
        this.layoutTemplates();
        this.saveTemplates();
    },
    
    changeScaleOfTemplateClicked: function(elem, event) {
        event.preventDefault();
        event.stopPropagation();
        var index = $(elem).attr("data-template-id");
        if(!index || index < 0) return;
        var newScale = window.prompt("Enter the new desired scale for this template (relative to 1):", this.templates[index].scale || 1);
        if(!newScale) return;
        this.templates[index].scale = newScale;
        this.layoutTemplates();
        this.saveTemplates();
    },
    
    moveToTemplateClicked: function(elem, event) {
        event.preventDefault();
        event.stopPropagation();
        var index = $(elem).attr("data-template-id");
        if(!index || index < 0) return;
        var pos = this.templates[index].pos;
        this.zoomIntoPoint(pos.x, pos.y, false);
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
});

var hash = hashHandler.getHash();
var hashKeys = Object.keys(hash);
if(hashKeys.indexOf("signin") > 0 || hashKeys.indexOf("logintext") > 0) {
    if(hashKeys.indexOf("logintext") > 0) {
        SignInDialogController.showErrorOnTab("sign-in", hash["logintext"])
        hashHandler.deleteHashKey("logintext");
    }
    SignInDialogController.show("sign-in");
    hashHandler.deleteHashKey("signin");
} else if(hashKeys.indexOf("signup") > 0) {
    SignInDialogController.show("sign-up");
    hashHandler.deleteHashKey("signup");
}

$("*[data-place-trigger]").click(function() {
    var trigger = $(this).data("place-trigger");
    if(trigger == "openSignInDialog") {
        SignInDialogController.show("sign-in");
    } else if(trigger == "openSignUpDialog") {
        SignInDialogController.show("sign-up");
    } else if(trigger == "openAuthDialog") {
        SignInDialogController.show();
    }
});

if(place.isSignedIn()) {
    var changelogController = {
        contentElement: $("#changelog-content"),
        changelogs: null, pagination: null,
        isLoadingChangelogs: false,

        setup: function() {
            $(document).on("keydown", (e) => {
                var isLeft = e.keyCode == 37, isRight = e.keyCode == 39;
                if(ChangelogDialogController.isShowing() && (isLeft || isRight) && this.pagination) {
                    e.preventDefault();
                    if(this.pagination.next && isRight) this.requestChangelogPage(this.pagination.next);
                    if(this.pagination.previous && isLeft) this.requestChangelogPage(this.pagination.previous);
                }
            });

            return this;
        },

        getMissedChangelogs: function() {
            if(this.isLoadingChangelogs) return;
            this.isLoadingChangelogs = true;
            placeAjax.get("/api/changelog/missed", null, null, () => { this.isLoadingChangelogs = false; }).then((data) => {
                placeAjax.post("/api/changelog/missed");
                this.changelogs = data.changelogs;
                this.pagination = data.pagination;
                this.layoutChangelogs();
                if(this.changelogs && this.changelogs.length > 0) this.showDialog();
            }).catch((err) => console.warn("Couldn't load changelogs: " + err));
        },

        requestChangelogPage: function(id) {
            if(this.isLoadingChangelogs) return;
            this.isLoadingChangelogs = true;
            placeAjax.get("/api/changelog/" + id, null, null, () => { this.isLoadingChangelogs = false; }).then((data) => {
                if(data.changelog) this.changelogs = [data.changelog];
                else this.changelogs = [];
                this.pagination = data.pagination;
                this.layoutChangelogs();
            }).catch((err) => console.warn("Couldn't load changelog with ID:" + id + ", error: " + err));
        },

        showDialog: function()  {
            ChangelogDialogController.show();
        },

        layoutChangelogs: function() {
            if(!this.changelogs) return this.contentElement.addClass("needs-margin").text("Loading…");
            if(this.changelogs.length <= 0) return this.contentElement.addClass("needs-margin").text("There's no changelog to show.");
            this.contentElement.html("").removeClass("needs-margin");
            this.changelogs.forEach((changelog) => {
                var element = $("<div>").addClass("changelog-info").attr("data-changelog-version", changelog.version).appendTo(this.contentElement);
                $("<p>").addClass("subhead extra-margin").text(this.getFormattedDate(changelog.date)).appendTo(element);
                $("<p>").html(changelog.html).appendTo(element);
            });
            if(this.pagination) {
                var paginationContainer = $("<ul>").addClass("pager").appendTo($("<nav>").attr("aria-label", "Changelog page navigation").appendTo(this.contentElement));
                var previous = $("<a>").html("<span aria-hidden=\"true\">&larr;</span> Older").appendTo($("<li>").addClass("previous").appendTo(paginationContainer));
                var next = $("<a>").html("Newer <span aria-hidden=\"true\">&rarr;</span>").appendTo($("<li>").addClass("next").appendTo(paginationContainer));
                if(this.pagination.previous) previous.attr("href", "javascript:void(0)").click(() => this.requestChangelogPage(this.pagination.previous));
                else previous.parent().addClass("disabled");
                if(this.pagination.next) next.attr("href", "javascript:void(0)").click(() => this.requestChangelogPage(this.pagination.next));
                else next.parent().addClass("disabled");
            }
        },

        getFormattedDate: function(dateStr) {
            var date = new Date(dateStr);
            var t = new Date(), y = new Date();
            y.setDate(y.getDate() - 1);
            if(date.toDateString() == (new Date()).toDateString()) return "Today";
            else if(date.toDateString() == y.toDateString()) return "Yesterday";
            else return date.toLocaleDateString();
        }
    }.setup();
    changelogController.getMissedChangelogs();
}
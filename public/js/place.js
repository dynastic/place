//
//  Place.js
//  -----------
//  Written by AppleBetas and nullpixel. Inspired by Reddit's /r/place.
//

const size = 1000

// Controller that looks after panning and zooming
var createInteractionController = function (canvasDraggable, canvas) {
    let desiredZoom = 1;

    let desiredX = 1;
    let desiredY = 1;

    let animatePanning = false;

    // Handles panning
    let dragListener = (moveEvent) => {
        // Grab the last x and y from the element
        let x = (parseFloat(canvasDraggable.getAttribute('data-x')) || 0) + moveEvent.dx;
        let y = (parseFloat(canvasDraggable.getAttribute('data-y')) || 0) + moveEvent.dy;
        
        // Translate the element
        $("#canvas-draggable")[0].style.webkitTransform = $("#canvas-draggable")[0].style.transform = `translate(${x}px, ${y}px)`;

        // Save the new coords
        canvasDraggable.setAttribute('data-x', x);
        canvasDraggable.setAttribute('data-y', y);
    }

    // Handles pinch-to-zoom
    let gestureListener = (gestureEvent) => {
        // Grab the current scale from element
        let scale = (parseFloat(canvasDraggable.getAttribute('data-scale')) || 1) * (1 + gestureEvent.ds);
        canvas.style.webkitTransform =
        canvas.style.transform = 'scale(' + scale + ')';
        canvasDraggable.setAttribute('data-scale', scale);
        dragListener(gestureEvent);

        // TODO: Figure out how to zoom in where we are pinching

        /*
        var scaledBox = {
            x: -scaleElement.getBoundingClientRect().left + (event.box.x / scale),
            y: -scaleElement.getBoundingClientRect().top + (event.box.y / scale), 
            width: event.box.width / scale,
            height: event.box.height / scale
        }

        var origin = {
            x: scaledBox.x + (scaledBox.width / 2),
            y: scaledBox.y + (scaledBox.height / 2)
        }
        

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'black'
        ctx.fillRect(origin.x, origin.y, 10, 10)
        ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height)
        //alert("left: " + scaleElement.getBoundingClientRect().top + ", middle: " + event.box.y + (event.box.height / 2))
       // alert(JSON.stringify(origin))
       */
         //scaleElement.style['-webkit-transform-origin'] = `${origin.x}px ${origin.y}px`
    }

    let animateZoom = () => {
        let currentZoom = (parseFloat(canvasDraggable.getAttribute('data-scale')) || 1)
        let currentX = (parseFloat(canvasDraggable.getAttribute('data-x')) || 0)
        let currentY = (parseFloat(canvasDraggable.getAttribute('data-y')) || 0)

        if (Math.abs(desiredZoom - currentZoom) > 0.001 || Math.abs(desiredX - currentX) > 5 || Math.abs(desiredY - currentY) > 5) {
            canvasDraggable.setAttribute('data-scale', currentZoom += (desiredZoom - currentZoom) / 10);

            canvasDraggable.setAttribute('data-x', currentX += (desiredX - currentX) / 10);
            canvasDraggable.setAttribute('data-y', currentY += (desiredY - currentY) / 10);
            
            let mockEvent = {dx: 0, dy: 0, ds: 0}
            gestureListener(mockEvent);
            window.requestAnimationFrame(animateZoom);
        }
    }

    let doubleTapListener = (tapEvent) => {
        let currentZoom = (parseFloat(canvasDraggable.getAttribute('data-scale')) || 1)
        desiredZoom = (currentZoom < 3) ? 4 : 1

        let rect = canvas.getBoundingClientRect();

        // Get absolute canvas positions (a pixel coord on the canvas)
        //let currentCanvasX = 
        //let currentCanvasY = Math.abs(rect.top - tapEvent.clientY)

        //let currentCanvasX = (parseFloat(canvasDraggable.getAttribute('data-x')) || 0);
        //let currentCanvasY = (parseFloat(canvasDraggable.getAttribute('data-y')) || 0);

        let originX, originY;

        if (desiredZoom > desiredZoom) {
            originX = Math.abs(rect.left - tapEvent.clientX)
            originY = Math.abs(rect.top - tapEvent.clientY)
        } else {
            originX = rect.width / 2;
            originY = rect.height / 2;
        }

        let centerX = tapEvent.clientX - (window.innerWidth / 2)
        let centerY = tapEvent.clientY - (window.innerHeight / 2)

        let newX = (parseFloat(canvasDraggable.getAttribute('data-x')) || 0) - rect.width /2 + ((rect.width * desiredZoom) /  2) - (originX * desiredZoom) + originX - centerX
        let newY = (parseFloat(canvasDraggable.getAttribute('data-y')) || 0) - rect.height /2 + ((rect.height * desiredZoom) /  2) - (originY * desiredZoom) + originY - centerY

        desiredX = newX;
        desiredY = newY;

        //canvasDraggable.setAttribute('data-x', newX)
        //canvasDraggable.setAttribute('data-y', newY)

        window.requestAnimationFrame(animateZoom)
    }

    // Use interact.js to allow the canvas to be dragged
    interact(canvasDraggable).draggable({
        inertia: true, // Makes it throwable
        onmove: dragListener
    }).gesturable({ // Enables gestures for pinch to zoom
        onmove: gestureListener
    }).on('doubletap', doubleTapListener.bind(this))
}

var createCanvasController = function(canvas) {
    let ctx = canvas.getContext("2d");
    canvas.width = 1000
    canvas.height = 1000

    // Disable image smoothing
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    
    return {
        canvas: canvas,
        ctx: ctx,
        isDisplayDirty: false,

        clearCanvas: function() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.isDisplayDirty = true;
        },

        drawImage: function(image) {
            //this.ctx.fillRect(0, 0, 100, 100)
            this.ctx.drawImage(image, 0, 0, size, size);
            this.isDisplayDirty = true;
        },

        setPixel: function(colour, x, y) {
            this.ctx.fillStyle = colour;
            this.ctx.fillRect(x, y, 1, 1);
            this.isDisplayDirty = true;
        }
    }
}

var notificationHandler = {
    notificationsSupported: "Notification" in window,

    canNotify: function() {
        console.log(this.currenr)
        return Notification.permission == "granted";
    },

    isAbleToRequestPermission: function() {
        if(!this.notificationsSupported) return false;
        return Notification.permission !== 'denied' || Notification.permission === "default";
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
            //icon: "/favicon.ico",
            body: message
        });
    }
}

var place = {
    socket: null,
    zoomButton: null,
    dragStart: null,
    touches: [],
    DEFAULT_COLOURS: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],
    selectedColour: null, handElement: null, unlockTime: null, secondTimer: null,
    notificationHandler: notificationHandler,

    start: function(canvas, canvasDraggable, cameraController, colourPaletteElement) {
        this.canvas = canvas;
        this.canvasController = createCanvasController(canvas);
        this.interactionController = createInteractionController(canvasDraggable, canvas)
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

        this.cameraController = cameraController;

        let spawnPoint = this.getRandomSpawnPoint()
        //this.setCanvasPosition(spawnPoint.x, spawnPoint.y);

        this.loadImage().then((image) => {
            this.canvasController.clearCanvas();
            this.canvasController.drawImage(image);
        });

        this.socket = this.startSocketConnection()
    },

    startSocketConnection() {
        var socket = io();
        socket.on('error', e => console.log('socket error: ' + e));
        socket.on('connect', () => console.log("socket successfully connected"));

        socket.on('tile_placed', this.liveUpdateTile.bind(this))
        return socket;
    },

    getRandomSpawnPoint: function() {
        function getRandomTileNumber() {
            return Math.random() * size - (size / 2);
        }
        return {x: getRandomTileNumber(), y: getRandomTileNumber()};
    },

    liveUpdateTile: function (data) {
        this.setPixel(`rgb(${data.colour.r}, ${data.colour.g}, ${data.colour.b})`, data.x, data.y)
    },

    setupColours: function() {
        $(this.colourPaletteElement).remove(".colour-option");
        this.colourPaletteOptionElements = [];
        this.DEFAULT_COLOURS.forEach((colour, index) => {
            let elem = $("<div class=\"colour-option" + (colour.toLowerCase() == "#ffffff" ? " is-white" : "") + "\" style=\"background-color: " + colour + ";\" data-colour=\"" + (index + 1) + "\"></div>").appendTo(this.colourPaletteElement)[0];
            this.colourPaletteOptionElements.push(elem);
        });
    },

    loadImage: function() {
        return new Promise((resolve, reject) => {
            image = new Image();
            image.src = "/api/board-image";
            image.onload = () => {
                resolve(image);
            };
        });
    },

    _adjustZoomButtonText: function() {
        let zoomIcon = `<i class="fa fa-fw fa-search-${this.zooming.zoomedIn ? "minus" : "plus"}"></i>`;
        if (this.zoomButton) $(this.zoomButton).html(zoomIcon + (this.zooming.zoomedIn ? "Zoom Out" : "Zoom In"))
    },

    setZoomButton: function(btn) {
        this.zoomButton = btn;
        //this._adjustZoomButtonText();
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
                if(data.success) {
                    if(data.timer.canPlace) this.changePlaceTimerVisibility(false);
                    else {
                        a.unlockTime = (new Date().getTime() / 1000) + data.timer.seconds;
                        a.secondTimer = setInterval(() => a.checkSecondsTimer(), 1000);
                        a.checkSecondsTimer();
                    }
                } else failToPost(data.error);
            }).fail(() => this.changePlaceTimerVisibility(false));
        }
        this.changePlaceTimerVisibility(false);
    },

    checkSecondsTimer: function() {
        if(this.unlockTime && this.secondTimer) {
            let time = Math.round(this.unlockTime - new Date().getTime() / 1000);
            if(time > 0) {
                let minutes = ~~(time / 60), seconds = time - minutes * 60;
                let formattedTime = `${minutes}:${seconds.toString().padLeft("0", 2)}`;
                let shouldShowNotifyButton = !this.notificationHandler.canNotify() && this.notificationHandler.isAbleToRequestPermission();
                $(this.placeTimer).children("span").html("You may place again in <strong>" + formattedTime + "</strong>." + (shouldShowNotifyButton ? " <a href=\"#\" id=\"notify-me\">Notify me</a>." : ""));
                return;
            } else {
                this.notificationHandler.sendNotification("Place 2.0", "You may now place!")
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
        //this.handElement = $(elem).clone().addClass("hand").appendTo($(this.zoomController).parent())[0];
    },

    deselectColour: function() {
        this.selectedColour = null;
        $(this.handElement).remove();
    },

    canvasClicked: function(x, y, event) {
        function failToPost(error) {
            let defaultError = "An error occurred while trying to place your pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
        }

        // Don't even try if it's out of bounds
        if (x < 0 || y < 0 || x > this.canvas.width - 1 || y > this.canvas.height - 1) return;

        // Make the user zoom in before placing pixel
        if(!this.zooming.zoomedIn) return this.zoomIntoPoint(x, y);

        var a = this;
        if(this.selectedColour !== null && !this.placing) {
        this.changePlacingModalVisibility(true);
        this.placing = true;
            $.post("/api/place", {
                x: x, y: y, colour: this.selectedColour
            }).done(data => {
                if(data.success) {
                    a.setPixel(a.DEFAULT_COLOURS[a.selectedColour], x, y);
                    a.deselectColour();
                    a.updatePlaceTimer();
                } else failToPost(data.error);
            }).fail(data => failToPost(data.responseJSON.error)).always(() => {
                this.changePlacingModalVisibility(false);
                this.placing = false;
            });
        }
    },

    setPixel: function(colour, x, y) {
        this.canvasController.setPixel(colour, x, y);
    }
}

String.prototype.padLeft = function(pad, length) {
    return (new Array(length + 1).join(pad) + this).slice(-length);
}

place.start($("canvas#place-canvas")[0], $("#canvas-draggable")[0], $("#camera-controller")[0], $("#palette")[0]);
place.setZoomButton($("#zoom-button")[0]);
//
//  Place.js
//  -----------
//  Written by AppleBetas and nullpixel. Inspired by Reddit's /r/place.
//

const size = 1000;

var createCanvasController = function(canvas) {
    let ctx = canvas.getContext("2d");
    // Disable image smoothing
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    // Buffer
    return {
        canvas: canvas,
        ctx: ctx,
        isDisplayDirty: false,

        clearCanvas: function() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.isDisplayDirty = true;
        },

        drawImage: function(image) {
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

var place = {
    zoomedIn: false,
    zoomButton: null,
    dragStart: null,
    isMouseDown: false, shouldClick: true,
    panX: 0,
    panY: 0,
    DEFAULT_COLOURS: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],
    selectedColour: null, handElement: null,

    start: function(canvas, zoomController, cameraController, displayCanvas, colourPaletteElement) {
        this.canvas = canvas;
        this.canvasController = createCanvasController(canvas);
        this.displayCanvas = displayCanvas;
        this.setupDisplayCanvas(this.displayCanvas);

        this.colourPaletteElement = colourPaletteElement;
        this.setupColours();
        this.placeTimer = $(this.colourPaletteElement).children("#place-timer");
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
        controller.onmousedown = (event) => this.handleMouseDown(event || window.event);
        controller.onmouseup = (event) => this.handleMouseUp(event || window.event);
        controller.onmouseout = (event) => { this.shouldClick = false; this.handleMouseUp(event || window.event) };
        controller.onmousemove = (event) => {
            if (this.isMouseDown) this.handleMouseDrag(event || window.event);
            this.handleMouseMove(event || window.event);
        }
        controller.addEventListener("touchstart", (event) => this.handleMouseDown(event.changedTouches[0]));
        controller.addEventListener("touchmove", (event) => { event.preventDefault(); if (this.isMouseDown) this.handleMouseDrag(event.changedTouches[0]); });
        controller.addEventListener("touchend", (event) => this.handleMouseUp(event.changedTouches[0]));
        controller.addEventListener("touchcancel", (event) => this.handleMouseUp(event.changedTouches[0]));

        window.onresize = () => this.handleResize();

        this.zoomController = zoomController;
        this.cameraController = cameraController;

        this.loadImage().then((image) => {
            this.canvasController.clearCanvas();
            this.canvasController.drawImage(image);
            this.updateDisplayCanvas();
            this.displayCtx.imageSmoothingEnabled = false;
        });
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
        let zoom = this._getZoomMultiplier();
        let mod = size / 2;
        this.displayCtx.drawImage(this.canvas, dcanvas.width / 2 + (this.panX - mod - 0.5) * zoom, dcanvas.height / 2 + (this.panY - mod - 0.5) * zoom, this.canvas.width * zoom, this.canvas.height * zoom);
    },

    _getZoomMultiplier: function() {
        return this.zoomedIn ? 40 : 4;
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

    setZoomedIn: function(zoomedIn) {
        this.zoomedIn = zoomedIn;
        if (zoomedIn) $(this.zoomController).parent().addClass("zoomed");
        else $(this.zoomController).parent().removeClass("zoomed");
        this.updateDisplayCanvas();
        this._adjustZoomButtonText();
    },

    toggleZoom: function() {
        this.setZoomedIn(!this.zoomedIn);
    },

    _adjustZoomButtonText: function() {
        if (this.zoomButton) $(this.zoomButton).text(this.zoomedIn ? "Zoom Out" : "Zoom In")
    },

    setZoomButton: function(btn) {
        this.zoomButton = btn;
        var a = this;
        this._adjustZoomButtonText();
        $(btn).click(function() {
            a.toggleZoom();
        });
    },

    moveCamera: function(deltaX, deltaY, animated) {
        if (typeof animated === 'undefined') animated = false;
        let cam = $(this.cameraController);
        let zoomModifier = this._getZoomMultiplier();
        let x = deltaX / zoomModifier,
            y = deltaY / zoomModifier;
        this.setCanvasPosition(x, y, true);
        this.updateDisplayCanvas();
    },

    setCanvasPosition: function(x, y, delta = false) {
        let deltaStr = delta ? "+=" : ""
        $(this.cameraController).css({
            top: `${deltaStr}${y}px`,
            left: `${deltaStr}${x}px`
        })
        if (delta) this.panX += x, this.panY += y;
        else this.panX = x, this.panY = y;
    },

    handleMouseMove: function(event) {
        if(this.handElement) {
            let elem = $(this.handElement);
            elem.css({
                left: event.pageX - (elem.width() / 2),
                top: event.pageY - (elem.height() / 2),
            });
        }
    },

    handleMouseDown: function(event) {
        this.isMouseDown = true;
        $(this.zoomController).addClass("grabbing");
        this.dragStart = { x: event.pageX, y: event.pageY };
    },

    handleMouseDrag: function(event) {
        this.shouldClick = false;
        if (this.dragStart) this.moveCamera(event.pageX - this.dragStart.x, event.pageY - this.dragStart.y);
        this.dragStart = { x: event.pageX, y: event.pageY };
    },

    handleMouseUp: function(event) {
        if(this.shouldClick) {
            if(event.target === this.colourPaletteElement || this.colourPaletteOptionElements.includes(event.target) || event.target == this.zoomButton || !this.shouldClick) return;
            let zoom = this._getZoomMultiplier();
            console.log(Math.round((event.pageY - $(this.cameraController).offset().top) / zoom))
            this.canvasClicked(Math.round((event.pageX - $(this.cameraController).offset().left) / zoom), Math.round((event.pageY - $(this.cameraController).offset().top) / zoom))
        }
        this.shouldClick = true;
        this.isMouseDown = false;
        $(this.zoomController).removeClass("grabbing");
        dragStart = null;
    },

    isSignedIn: function() {
        return $("body").hasClass("signed-in");
    },

    placeTimerShouldShow: function() {
        return this.isSignedIn();
    },

    updatePlaceTimer: function(animated) {
        if (typeof animated === 'undefined') animated = false;
        let shouldShow = this.placeTimerShouldShow();
        if (animated) {
            if (shouldShow) $(this.placeTimer).fadeIn();
            else $(this.placeTimer).fadeOut();
        } else {
            if (shouldShow) $(this.placeTimer).show();
            else $(this.placeTimer).hide();
        }
    },

    selectColour: function(colourID) {
        this.deselectColour();
        this.selectedColour = colourID - 1;
        let elem = this.colourPaletteOptionElements[this.selectedColour];
        this.handElement = $(elem).clone().addClass("hand").appendTo($(this.zoomController).parent())[0];
        $(this.zoomController).addClass("selected");
    },

    deselectColour: function() {
        this.selectedColour = null;
        $(this.handElement).remove();
        $(this.zoomController).removeClass("selected");
    },

    zoomIntoPoint: function(x, y) {
        this.setCanvasPosition(-(x - size / 2), -(y - size / 2));
        this.setZoomedIn(true);
    },

    canvasClicked: function(x, y, event) {
        function failToPost(error) {
            let defaultError = "An error occurred while trying to place your pixel.";
            window.alert(!!error ? error.message || defaultError : defaultError);
        }
        if(!this.zoomedIn) this.zoomIntoPoint(x, y);
        var a = this;
        if(this.selectedColour) {
            $.post("/api/place", {
                x: x, y: y, colour: this.selectedColour
            }).done(function(data) {
                if(data.success) {
                    a.setPixel(a.DEFAULT_COLOURS[a.selectedColour], x, y);
                    a.deselectColour();
                } else failToPost(data.error);
            }).fail(function(data) {
                failToPost(data.responseJSON.error);
            })
        }
    },

    setPixel: function(colour, x, y) {
        this.canvasController.setPixel(colour, x, y);
        this.updateDisplayCanvas();
    }
}

place.start($("canvas#place-canvas-draw")[0], $("#zoom-controller")[0], $("#camera-controller")[0], $("canvas#place-canvas")[0], $("#palette")[0]);
place.setZoomButton($("#zoom-button")[0]);
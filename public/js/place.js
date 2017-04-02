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
        }
    }
}

var place = {
    zoomedIn: false,
    zoomButton: null,
    dragStart: null, isMouseDown: false, panX: 0, panY: 0,

    start: function(canvas, zoomController, cameraController, displayCanvas) {
        this.canvas = canvas;
        this.canvasController = createCanvasController(canvas);
        this.displayCanvas = displayCanvas;
        this.displayCtx = displayCanvas.getContext("2d");
        this.setupDisplayCanvas();

        zoomController.onmousedown = (event) => this.handleMouseDown(event || window.event);
        zoomController.onmouseup = (event) => this.handleMouseUp(event || window.event);
        zoomController.onmousemove = (event) => { if (this.isMouseDown) this.handleMouseDrag(event || window.event); }

        window.onresize = () => this.handleResize();

        this.zoomController = zoomController;
        this.cameraController = cameraController;

        this.loadImage().then((image) => {
            this.canvasController.clearCanvas();
            this.canvasController.drawImage(image);
            this.updateDisplayCanvas();
        });
    },

    handleResize: function() {
        this.displayCanvas.height = window.innerHeight;
        this.displayCanvas.width = window.innerWidth;
        this.updateDisplayCanvas();
    },

    setupDisplayCanvas: function() {
        this.displayCtx.mozImageSmoothingEnabled = false;
        this.displayCtx.webkitImageSmoothingEnabled = false;
        this.displayCtx.msImageSmoothingEnabled = false;
        this.displayCtx.imageSmoothingEnabled = false;
        this.handleResize();
        this.updateDisplayCanvas();
    },

    updateDisplayCanvas: function() {
        let dcanvas = this.displayCanvas;
        this.displayCtx.clearRect(0, 0, dcanvas.width, dcanvas.height);
        let zoom = this.getZoomMultiplier();
        let mod = size / 2;
        this.displayCtx.drawImage(this.canvas, dcanvas.width / 2 + (this.panX - mod - 0.5) * zoom, dcanvas.height / 2 + (this.panY - mod - 0.5) * zoom, this.canvas.width * zoom, this.canvas.height * zoom);
    },

    getZoomMultiplier: function() {
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
        if(zoomedIn) $(this.zoomController).addClass("zoomed");
        else $(this.zoomController).removeClass("zoomed");
    },

    toggleZoom: function() {
        this.setZoomedIn(!this.zoomedIn);
        this._adjustZoomButtonText();
    },

    _adjustZoomButtonText: function() {
        if(this.zoomButton) $(this.zoomButton).text(this.zoomedIn ? "Zoom Out" : "Zoom In")
    },

    setZoomButton: function(btn) {
        this.zoomButton = btn;
        this._adjustZoomButtonText();
        var a = this;
        $(btn).click(function() {
            a.toggleZoom();
        });
    },

    moveCamera: function(deltaX, deltaY, animated) {
        if(typeof animated === 'undefined') animated = false;
        let cam = $(this.cameraController);
        let zoomModifier = this.getZoomMultiplier();
        let x = deltaX / zoomModifier, y = deltaY / zoomModifier;
        cam.css({
            top: `+=${y}px`,
            left: `+=${x}px`
        });
        this.panX += x;
        this.panY += y;
        this.updateDisplayCanvas();
    },

    handleMouseDown: function(event) {
        this.isMouseDown = true;
        $(this.zoomController).addClass("grabbing");
        this.dragStart = {x: event.pageX, y: event.pageY};
    },

    handleMouseDrag: function(event) {
        if(this.dragStart) this.moveCamera(event.pageX - this.dragStart.x, event.pageY - this.dragStart.y);
        this.dragStart = {x: event.pageX, y: event.pageY};
    },

    handleMouseUp: function(event) {
        this.isMouseDown = false;
        $(this.zoomController).removeClass("grabbing");
        dragStart = null;
    }
}

place.start($("canvas#place-canvas-draw")[0], $("#zoom-controller")[0], $("#camera-controller")[0], $("canvas#place-canvas")[0]);
place.setZoomButton($("#zoom-button")[0]);

function move(x, y) {
    place.moveCamera(x, y, false);
}
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
            this.ctx.drawImage(image, 0, 0);
            this.isDisplayDirty = true;
        }
    }
}

var place = {
    zoomedIn: false,
    zoomButton: null,

    start: function(canvas, zoomController, cameraConroller) {
        this.canvas = canvas;
        this.canvasController = createCanvasController(canvas);

        this.zoomController = zoomController;
        this.cameraConroller = cameraConroller;

        this.loadImage().then((image) => {
            this.canvasController.clearCanvas();
            this.canvasController.drawImage(image);
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
    }
}

place.start($("canvas#place-canvas")[0], $("#zoom-controller")[0], $("#camera-controller")[0]);
place.setZoomButton($("#zoom-button")[0]);
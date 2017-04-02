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
    let buffer = new ArrayBuffer(size * size * 4)
    return {
        canvas: canvas,
        ctx: ctx,

        buffer: buffer,
        readBuffer: new Uint8ClampedArray(buffer),
        writeBuffer: new Uint32Array(buffer),

        isBufferDirty: false,
        isDisplayDirty: false,

        clearCanvas: function() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.isDisplayDirty = true
        },
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

        this.loadBitmap().then((pixels) => {
            this.canvasController.clearCanvas()
        });
    },

    loadBitmap: function() {
        return new Promise((resolve, reject) => {
            function fillPixels(e) {
                    for (var t = 0; t < e.byteLength; t++)
                        pixels[s + 2 * t] = e[t] >> 4, pixels[s + 2 * t + 1] = e[t] & 15;
                    s += e.byteLength * 2
            }
            var pixels = new Uint8Array(size * size), s = 0;
            var req = new XMLHttpRequest();
            req.responseType = "arraybuffer";
            req.open("GET", "/api/board-bitmap", true);
            req.onload = function(response) {
                let data = req.response;
                let colours = new Uint8Array(data);
                fillPixels(colours);
                resolve(pixels);
            }
            req.send(null);
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
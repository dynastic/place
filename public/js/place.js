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

        setBufferState: function(e, t) {
            this.writeBuffer[e] = t;
            this.isBufferDirty = true;
        },

        drawBufferToDisplay: function() {
            var e = new ImageData(this.readBuffer, this.width, this.height);
            this.ctx.putImageData(e, 0, 0);
            this.isBufferDirty = false;
        }
    }
}

var place = {
    zoomedIn: false,
    zoomButton: null,
    pixels: null,
    DEFAULT_COLOR_PALETTE: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],

    start: function(canvas, zoomController, cameraConroller) {
        this.canvas = canvas;
        this.canvasController = createCanvasController(canvas);

        this.zoomController = zoomController;
        this.cameraConroller = cameraConroller;

        this.pixels = new Uint8Array(new ArrayBuffer(size * size))
        this.setColorPalette(this.DEFAULT_COLOR_PALETTE)

        this.loadBitmap().then((pixels) => {
            this.canvasController.clearCanvas()
            this.doInitialDraw(pixels);
        });
    },

    doInitialDraw: function(pixels) {
        var t = [], n, r;
        for (var i = 0; i < pixels.length; i++) {
            n = pixels[i];
            r = this.getPaletteColorABGR(n);
            this.canvasController.setBufferState(i, r);
            n > 0 && (this.pixels[i] = n);
        }
        this.canvasController.drawBufferToDisplay()
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
    },

    setColorPalette: function(palette) {
        var t = this.palette === null;
        this.palette = palette;
        var n = new DataView(new ArrayBuffer(4));
        var a = this;
        n.setUint8(0, 255), this.paletteABGR = palette.map(function(colour) {
            var t = a.parseHexColour(colour);
            return n.setUint8(1, t.blue), n.setUint8(2, t.green), n.setUint8(3, t.red), n.getUint32(0)
        })//, t || this.doInitialDraw(this.state)
    },

    getPaletteColorABGR: function(e) {
        return e = Math.min(15, Math.max(0, e | 0)), this.paletteABGR[e % this.paletteABGR.length] || k
    },

    parseHexColour: function(e) {
        var t = parseInt(e.slice(1), 16);
        return {
            red: t >> 16 & 255,
            green: t >> 8 & 255,
            blue: t & 255
        }
    }
}

place.start($("canvas#place-canvas")[0], $("#zoom-controller")[0], $("#camera-controller")[0]);
place.setZoomButton($("#zoom-button")[0]);
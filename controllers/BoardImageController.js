exports.getAPIBoardImage = (req, res, next) => {
    if (!req.place.paintingManager.hasImage) return res.status(503).json({ success: false, error: { message: "We are not yet ready to take requests.", code: "not_ready" } });
    req.place.paintingManager.getOutputImage().then((info) => {
        if(info.hasChanged) res.set({ "X-Place-Last-Update": info.generated });
        return res.set({ "Content-Type": "image/png" }).send(info.image);
    }).catch((err) => {
        req.place.reportError("Error while serving board image: " + err);
        return res.status(500).json({ success: false, error: { message: "We could not retrieve the current board image.", code: "image_fail" } });
    });
};
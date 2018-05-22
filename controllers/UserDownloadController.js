exports.getAccountData = (req, res, next) => {
    req.user.getUserData().then((data) => {
        const filename = `${req.place.config.siteName} - ${req.user.name} data.json`;
        res.header("Content-disposition", "attachment; filename=" + filename).json(data)
    }).catch((err) => {
        req.place.reportError("An error occurred while retrieving user data " + err);
        res.status(500);
        req.responseFactory.sendRenderedResponse("errors/500");
    })
}
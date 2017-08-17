function reloadData() {
    placeAjax.get("/api/admin/stats", null, null, () => {
        setTimeout(reloadData, 2000);
    }).then((data) => {
        $("#users-online").text(data.stats.online.toLocaleString());
        $("#new-accounts").text(data.stats.signups24h.toLocaleString());
        $("#pixels-placed").text(data.stats.pixelsPlaced24h.toLocaleString());
        $("#pixels-placed-2").text(data.stats.pixelsPerMin.toLocaleString());
    }).catch(() => {});
}

$(document).ready(function() {
    reloadData();
});
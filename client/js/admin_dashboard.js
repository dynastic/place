$(document).ready(function() {
    reloadData();
});

function reloadData() {
    $.get("/api/admin/stats", function(data) {
        $("#users-online").text(data.stats.online.toLocaleString());
        $("#new-accounts").text(data.stats.signups24h.toLocaleString());
        $("#pixels-placed").text(data.stats.pixelsPlaced24h.toLocaleString());
        $("#pixels-placed-2").text(data.stats.pixelsPerMin.toLocaleString());
    }).always(function() {
        setTimeout(reloadData, 2000);
    });
}
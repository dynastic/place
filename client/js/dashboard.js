$(document).ready(function() {
    $.get("/api/admin/stats", function(data) {
        $("#users-online").text(data.stats.online);
        $("#new-accounts").text(data.stats.signups24h);
        $("#pixels-placed").text(data.stats.pixelsPlaced24h);
        $("#pixels-placed-2").text(data.stats.pixelsPerMin);
    });
});
$(document).ready(function() {
    $(".timeago").timeago();
    var getUserRow = function(user, relationString) {
        return `<div class="user"> 
            <div class="user-info">
                <a href="/@${user.username}" class="username">${user.username}</a>
                <span class="relation">${relationString}</span>
                <span class="signup">Signed up <strong><time class="timeago" title="${new Date(user.creationDate).toLocaleString()}" datetime="${new Date(user.creationDate).toISOString()}">${new Date(user.creationDate).toLocaleString()}</time></strong>.</span>
                ${user.statistics.lastPlace ? `<span class="last-place">Last placed <strong><time class="timeago" title="${new Date(user.statistics.lastPlace).toLocaleString()}" datetime="${new Date(user.statistics.lastPlace).toISOString()}">${new Date(user.statistics.lastPlace).toLocaleString()}</time></strong>.</span>` : ""}
                <span class="placed-tiles">Placed <strong>${user.statistics.totalPlaces.toLocaleString()} pixel${user.statistics.totalPlaces == 1 ? "" : "s"}</strong>.</span>
            </div>
            <div class="user-actions">${renderUserActions(user)}</div>
        </div>`;
    }
    placeAjax.get("/api/mod/similar_users/" + userID, null, null).then((response) => {
        $("#loading").remove();
        $(getUserRow(response.target, "Original User")).appendTo("#target-ctn");
        $(`<h4>${response.identifiedAccounts.length} Matching User${response.identifiedAccounts.length == 1 ? "" : "s"}</h4>`).appendTo("#similar-ctn > .heading");
        response.identifiedAccounts.forEach((identification) => {
            $(getUserRow(identification.user, `Same ${identification.reasons.map((item, i, arr) => item + (i == arr.length - 1 ? "" : i == arr.length - 2 ? " and " : ", ")).join("")}`)).appendTo("#similar");
        });
        $(".timeago").timeago();
    }).catch((err) => {
        $("#loading").text("An error occurred while loading data");
    });
});
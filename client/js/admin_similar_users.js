$(document).ready(function() {
    $(".timeago").timeago();
    var getUserRow = function(user, relationString) {
        return `<div class="user"> 
            <div class="user-info">
                <p class="username">${user.name}</p>
                <span class="relation">${relationString}</span>
                <span class="signup">Signed up <strong><time class="timeago" title="${new Date(user.creationDate).toLocaleString()}" datetime="${new Date(user.creationDate).toISOString()}">${new Date(user.creationDate).toLocaleString()}</time></strong>.</span>
                ${user.lastPlace ? `<span class="last-place">Last placed <strong><time class="timeago" title="${new Date(user.lastPlace).toLocaleString()}" datetime="${new Date(user.lastPlace).toISOString()}">${new Date(user.lastPlace).toLocaleString()}</time></strong>.</span>` : ""}
                <span class="placed-tiles">Placed <strong>${user.placeCount.toLocaleString()} tile${user.placeCount == 1 ? "" : "s"}</strong>.</span>
            </div>
            <div class="user-actions">${renderUserActions(user)}</div>
        </div>`;
    }
    $.get("/api/mod/similar_users/" + userID).success(function(response) {
        if(!response.success) return $("#loading").text("An error occurred while loading data");
        $("#loading").remove();
        $(getUserRow(response.target, "Original User")).appendTo("#target-ctn");
        $(`<h4>${response.identifiedAccounts.length} Matching User${response.identifiedAccounts.length == 1 ? "" : "s"}</h4>`).appendTo("#similar-ctn > .heading");
        response.identifiedAccounts.forEach(identification => {
            $(getUserRow(identification.user, `Same ${identification.reasons.map((item, i, arr) => item + (i == arr.length - 1 ? "" : i == arr.length - 2 ? " and " : ", ")).join("")}`)).appendTo("#similar");
        });
        $(".timeago").timeago();
    }).fail(function() {
        $("#loading").text("An error occurred while loading data");
    })
});
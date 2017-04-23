var actions = {
    ban: {
        url: "mod/toggle_ban",
        callback: function(data, elem) {
            if(data.banned) elem.text("Unban");
            else elem.text("Ban");
        },
        buttonText: function(data) {
            return `<a href="javascript:void(0)" class="btn btn-danger user-action-btn" data-user-action="ban">${data.banned ? "Unban" : "Ban"}</a>`
        }
    }
}

$("body").on("click", ".user-action-btn", function() {
    function handleError(data) {
        var error = "An unknown error occurred."
        if(typeof data.error !== 'undefined' && data.error.message) error = data.error.message;
        alert("Couldn't perform action on user: " + error);
    }
    var userID = $(this).parent().data("user-id");
    var action = actions[$(this).data("user-action")];
    var originalText = $(this).html();
    $(this).addClass("disabled");
    $(this).html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
    var elem = $(this);
    $.get(`/api/${action.url}/`, {id: userID}).success(function(data) {
        if(!data.success) return handleError(data);
        action.callback(data, elem);
    }).error(function(res) {
        handleError(typeof res.responseJSON === 'undefined' ? null : res.responseJSON);
        if(action.callbackModifiesText !== false) elem.html(originalText);
    }).always(function() {
        elem.removeClass("disabled");
        if(action.callbackModifiesText === false) elem.html(originalText);
    });
});
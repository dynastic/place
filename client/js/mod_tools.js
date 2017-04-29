var actions = {
    ban: {
        url: "mod/toggle_ban",
        btnStyle: "danger",
        callback: function(data, elem) {
            elem.text(`${data.banned ? "Unban" : "Ban"}`);
        },
        buttonText: function(data) {
            return data.banned ? "Unban" : "Ban";
        }
    },
    activation: {
        url: "mod/toggle_active",
        btnStyle: "warning",
        callback: function(data, elem) {
            elem.text(`${data.deactivated ? "Activate" : "Deactivate"}`);
        },
        buttonText: function(data) {
            return data.deactivated ? "Activate" : "Deactivate";
        }
    },
    mod: {
        url: "admin/toggle_mod",
        btnStyle: "info",
        adminOnly: true,
        callback: function(data, elem) {
            elem.text(`${data.moderator ? "Remove" : "Give"} Moderator`);
        },
        buttonText: function(data) {
            return `${data.moderator ? "Remove" : "Give"} Moderator`
        }
    }
}
var renderAction = function(actionName, data) {
    var action = actions[actionName];
    return `<a href="javascript:void(0)" class="btn btn-${action.btnStyle} user-action-btn" data-admin-only=${action.adminOnly === true} data-user-action="${actionName}">${action.buttonText(data)}</a>`;
}

var renderUserActions = function(user) {
    var currentUserID = $("body").data("user-id");
    var currentIsAdmin = $("body").data("user-is-admin");
    var currentIsMod = $("body").data("user-is-mod");
    var canTouchUser = (currentIsMod && !(user.moderator || user.admin)) || (currentIsAdmin && !user.admin);
    if(user._id) user.id = user._id;
    if(currentUserID == user.id || !canTouchUser) return ``;
    return `<div class="actions-ctn" data-user-id="${user.id}">
        <a href="/admin/users/similar/${user.id}" class="btn btn-warning">View Similar</a>
        ${renderAction("ban", user)}
        ${renderAction("activation", user)}
        ${renderAction("mod", user)}
    </div>`
}

$("body").on("click", ".user-action-btn", function() {
    function handleError(data) {
        var error = "An unknown error occurred."
        if(data && typeof data.error !== 'undefined' && data.error.message) error = data.error.message;
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

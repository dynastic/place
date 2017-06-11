var actions = {
    user: {
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
    },
    server: {
        reloadConfig: {
            url: "admin/reload_config",
            btnStyle: "success",
            adminOnly: true,
            callback: (data, elem) => {
                elem.text(actions.server.reloadConfig.buttonText(data));
                alert("Successfully reloaded configuration from file.")
            },
            buttonText: data => "Reload Config"
        },
        refreshClients: {
            url: "admin/refresh_clients",
            btnStyle: "danger",
            adminOnly: true,
            callback: (data, elem) => {
                elem.text(actions.server.refreshClients.buttonText(data));
                alert("Successfully refreshed all clients currently connected to websockets.")
            },
            buttonText: data => "Refresh All Clients"
        }
    }
}
var renderAction = function(actionName, data = {}, type = "user") {
    var action = actions[type][actionName];
    return `<a href="javascript:void(0)" class="btn btn-${action.btnStyle} ${type}-action-btn" data-admin-only=${action.adminOnly === true} data-${type}-action="${actionName}">${action.buttonText(data)}</a>`;
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

var renderServerActions = function() {
    return `<div class="actions-ctn">
        ${renderAction("reloadConfig", {}, "server")}
        ${renderAction("refreshClients", {}, "server")}
        <a href="javascript:void(0);" class="btn btn-info" data-toggle="modal" data-target="#broadcastModal">Broadcast message</button>
    </div>`
}

$("body").on("click", ".user-action-btn", function() {
    function handleError(data) {
        var error = "An unknown error occurred."
        if(data && typeof data.error !== 'undefined' && data.error.message) error = data.error.message;
        alert("Couldn't perform action on user: " + error);
    }
    var userID = $(this).parent().data("user-id");
    var action = actions.user[$(this).data("user-action")];
    var originalText = $(this).html();
    $(this).addClass("disabled");
    $(this).html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
    var elem = $(this);
    $.get(`/api/${action.url}/`, {id: userID}).done(function(data) {
        if(!data.success) return handleError(data);
        action.callback(data, elem);
    }).fail(function(res) {
        handleError(typeof res.responseJSON === 'undefined' ? null : res.responseJSON);
        if(action.callbackModifiesText !== false) elem.html(originalText);
    }).always(function() {
        elem.removeClass("disabled");
        if(action.callbackModifiesText === false) elem.html(originalText);
    });
});


$("body").on("click", ".server-action-btn", function() {
    function handleError(data) {
        var error = "An unknown error occurred."
        if(data && typeof data.error !== 'undefined' && data.error.message) error = data.error.message;
        alert("Couldn't perform action: " + error);
    }
    var action = actions.server[$(this).data("server-action")];
    var originalText = $(this).html();
    $(this).addClass("disabled");
    $(this).html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
    var elem = $(this);
    $.get(`/api/${action.url}/`).done(function(data) {
        if(!data.success) return handleError(data);
        action.callback(data, elem);
    }).fail(function(res) {
        handleError(typeof res.responseJSON === 'undefined' ? null : res.responseJSON);
        if(action.callbackModifiesText !== false) elem.html(originalText);
    }).always(function() {
        elem.removeClass("disabled");
        if(action.callbackModifiesText === false) elem.html(originalText);
    });
});


$("#broadcastForm").submit(function(e) {
    e.preventDefault();
    $.post("/api/admin/broadcast", {
        title: $(this).find("#inputBroadcastTitle").val(),
        message: $(this).find("#inputBroadcastMessage").val(),
        style: $(this).find("#inputBroadcastStyle").val(),
        timeout: $(this).find("#inputBroadcastTimeout").val()
    }).done(function(data) {
        if(!data.success) return alert("Couldn't send broadcast");
        $('#broadcastModal').modal('hide');
        alert("Successfully sent out broadcast to all connected clients.");
    }).fail(function() {
        alert("Couldn't send broadcast");
    })
})
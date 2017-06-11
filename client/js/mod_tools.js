var defaultBanReason = "";
var actionTemplates = null;

var actions = {
    user: {
        similar: {
            btnStyle: "info",
            type: "link",
            getLinkURL: data => `/admin/users/similar/${data.id}`,
            buttonText: data => "View Similar"
        },
        ban: {
            url: "mod/toggle_ban",
            btnStyle: "danger",
            getRequestData: function(elem) {
                return new Promise((resolve, reject) => {
                    if(elem.attr("data-user-banned") === "true") return resolve({});
                    var reason = window.prompt("Enter a reason to ban this user for:", defaultBanReason);
                    if(!reason) reject();
                    if(reason.length <= 3) return reject("Your ban reason must be over three characters long.");
                    resolve({reason: reason});
                })
            },
            buttonText: data => data.banned ? "Unban" : "Ban",
            getAttributes: function(data) {
                return {"data-user-banned": data.banned};
            },
        },
        activation: {
            url: "mod/toggle_active",
            btnStyle: "warning",
            buttonText: data => data.deactivated ? "Activate" : "Deactivate",
        },
        mod: {
            url: "admin/toggle_mod",
            btnStyle: "success",
            adminOnly: true,
            buttonText: data => `${data.moderator ? "Remove" : "Give"} Moderator`
        },
        editUserNotes: {
            url: "mod/user_notes",
            method: "POST",
            btnStyle: "primary",
            getRequestData: function(elem) {
                return new Promise((resolve, reject) => {
                    var id = elem.parent().attr("data-user-id");
                    if(!id) id = elem.parent().parent().attr("data-user-id")
                    $.get("/api/mod/user_notes", {id: id}).done(function(res) {
                        if(!res.success || res.userNotes == null) return reject("Couldn't fetch user notes");
                        bootbox.prompt({
                            title: "Edit user notes",
                            inputType: 'textarea',
                            value: res.userNotes,
                            callback: function (result) {
                                if(result == null) return reject();
                                resolve({notes: result});
                            },
                            buttons: {
                                confirm: {
                                    label: 'Save',
                                    className: 'btn-primary'
                                },
                                cancel: {
                                    label: 'Close',
                                    className: 'btn-default'
                                }
                            },
                        });
                    }).fail(() => reject("Couldn't fetch user notes"));
                })
            },
            buttonText: data => "Edit User Notes",
            getAttributes: function(data) {
                return {"data-user-banned": data.banned};
            },
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
var renderAction = function(actionName, data = {}, type = "user", dropdown = false) {
    var action = actions[type][actionName];
    var title = action.buttonText(data);
    var dropdownItem = null;
    var btn = $("<a>").attr("href", "javascript:void(0)").addClass(`${type}-action-btn ${dropdown ? "text" : "btn"}-${action.btnStyle} ${dropdown ? "dropdown" : "btn"}-action`).attr("data-admin-only", action.adminOnly === true).attr(`data-${type}-action`, actionName);
    if(typeof action.getAttributes === "function") btn.attr(action.getAttributes(data));
    if(typeof action.type !== "undefined" && action.type == "link") btn.attr("href", action.getLinkURL(data)).removeClass(`${type}-action-btn`);
    setActionDataOnElement(data, btn, action);
    if(dropdown) {
        dropdownItem = $("<li>");
        btn.appendTo(dropdownItem);
    } else {
        btn.addClass(`btn action-btn`);
    }
    return dropdown ? dropdownItem : btn;
}

var setActionDataOnElement = function(data, elem, action) {
    var title = action.buttonText(data);
    var isPressed = false;
    var text = title;
    if(typeof action.icon === "function") text = `<i class="fa fa-${action.icon(data)}"></i>`
    if(elem.hasClass("dropdown-action")) text = `<span class="text-${action.btnStyle}">${text}</span>`
    if(typeof action.isActive === "function") isPressed = action.isActive(data);
    if(isPressed) elem.addClass("active")
    else elem.removeClass("active");
    elem.html(text);
}

var actionIDs = ["similar", "ban", "activation", "editUserNotes", "mod"]

var canTouchUser = function(user) {
    var currentUserID = $("body").data("user-id");
    var currentIsAdmin = $("body").data("user-is-admin");
    var currentIsMod = $("body").data("user-is-mod");
    var canTouchUser = (currentIsMod && !(user.moderator || user.admin)) || (currentIsAdmin && !user.admin);
    if(user._id) user.id = user._id;
    return currentUserID != user.id && canTouchUser;
}

var renderUserActions = function(user) {
    if(!canTouchUser(user)) return "";
    if(user._id) user.id = user._id;
    var actionCtn = $("<div>").addClass("actions-ctn").attr("data-user-id", user.id);
    actionIDs.forEach(a => renderAction(a, user, "user").appendTo(actionCtn));
    return actionCtn[0].outerHTML;
}

var renderServerActions = function() {
    return `<div class="actions-ctn">
        ${renderAction("reloadConfig", {}, "server")[0].outerHTML}
        ${renderAction("refreshClients", {}, "server")[0].outerHTML}
        <a href="javascript:void(0);" class="btn btn-info" data-toggle="modal" data-target="#broadcastModal">Broadcast message</button>
    </div>`
}

var renderUserActionsDropdown = function(user) {
    if(!canTouchUser(user)) return "";
    var dropdownCtn = $("<div>").addClass("dropdown dropdown-inline user-action-dropdown-ctn").attr("data-user-id", user.id);
    var btn = $("<a>").addClass("dropdown-toggle").attr({type: "button", "data-toggle": "dropdown", "aria-haspopup": true, "aria-expanded": false}).html("<span class=\"caret\"></span>").appendTo(dropdownCtn);
    var dropdownList = $("<ul>").addClass("dropdown-menu").attr("data-user-id", user.id).appendTo(dropdownCtn);
    actionIDs.forEach(a => renderAction(a, user, "user", true).appendTo(dropdownList));
    return dropdownCtn[0].outerHTML;
}

var updateUserDropdowns = function(user) {
    $(`div.user-action-dropdown-ctn[data-user-id='${user.id}']`).html($(renderUserActionsDropdown(user))[0].innerHTML);
}

$("body").on("click", ".user-action-btn", function() {
    function handleError(data) {
        var error = "An unknown error occurred."
        if(data && typeof data.error !== 'undefined' && data.error.message) error = data.error.message;
        alert("Couldn't perform action on user: " + error);
    }
    var userID = $(this).parent().data("user-id");
    if(!userID) userID = $(this).parent().parent().data("user-id");
    var action = actions.user[$(this).data("user-action")];
    var elem = $(this);
    var method = "GET";
    if(typeof action.method !== "undefined") method = action.method;
    function continueWithRequestData(data) {
        var originalText = elem.html();
        elem.addClass("disabled").html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
        $.ajax({
            url:`/api/${action.url}/?id=${userID}`,
            method: method,
            data: data
        }).done(function(data) {
            if(!data.success || !data.user) return handleError(data);
            if(typeof action.callback === "function") action.callback(data.user, elem);
            setActionDataOnElement(data.user, elem, action);
            updateUserDropdowns(data.user);
            if(typeof action.getAttributes === "function") elem.attr(action.getAttributes(data));
        }).fail(res => handleError(typeof res.responseJSON === 'undefined' ? null : res.responseJSON)).always(function() {
            elem.removeClass("disabled");
            if(action.callbackModifiesText === false) elem.html(originalText);
        });
    }
    if(typeof action.getRequestData === "function") action.getRequestData($(this)).then(d => continueWithRequestData(d)).catch(err => { if(err) window.alert(err) });
    else continueWithRequestData({});
});

$("body").on("click", ".server-action-btn", function() {
    function handleError(data) {
        var error = "An unknown error occurred."
        if(data && typeof data.error !== 'undefined' && data.error.message) error = data.error.message;
        alert("Couldn't perform action: " + error);
    }
    var action = actions.server[$(this).data("server-action")];
    var data = {};
    if(typeof action.getRequestData === "function") data = action.getRequestData($(this));
    if(!data) return;
    var originalText = $(this).html();
    $(this).addClass("disabled");
    $(this).html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
    var elem = $(this);
    $.get(`/api/${action.url}/`, data).done(function(data) {
        if(!data.success) return handleError(data);
        action.callback(data, elem);
        if(typeof action.getAttributes === "function") elem.attr(action.getAttributes(data));
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

function getRowForAction(action) {
    var actionTemplate = actionTemplates[action.action];
    var randomString = function(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    function parseActionTemplate(template, action) {
        return eval('`' + template.replace(/\${/g, '${action.info.') + '`');
    }
    function renderUsernameText(user) {
        return `<strong><a href="/@${user.username}">${user.username}</a> ${renderUserActionsDropdown(user)}</strong>`;
    }

    var row = $("<div>").addClass("action").attr("data-action-id", action.id);
    var username = "<strong>Deleted user</strong>";
    var actionTxt = `<span class="action-str" title="${actionTemplate.displayName} - ${actionTemplate.category}">${actionTemplate.inlineDisplayName.toLowerCase()}</span>`;
    if(action.performingUser) username = renderUsernameText(action.performingUser);
    var moreInfoCtn = null;
    var sentenceEnd = "";
    var otherLines = "";
    if(Object.keys(action.info).length > 0) {
        if(typeof actionTemplate.sentenceEndTextFormatting !== 'undefined') sentenceEnd = parseActionTemplate(actionTemplate.sentenceEndTextFormatting, action);
        if(typeof actionTemplate.otherLinesTextFormatting !== 'undefined') otherLines = "<br>" + parseActionTemplate(actionTemplate.otherLinesTextFormatting, action);
        if(typeof actionTemplate.hideInfo === 'undefined' || !actionTemplate.hideInfo) {
            var moreInfoCtn = $("<div>").addClass("info-collapse-ctn");
            var id = `info-collapse-${randomString(16)}-${action.id}`;
            var infoCtn = $("<div>").addClass("collapse info-collapse").attr("id", id).appendTo(moreInfoCtn);
            var infoList = $("<samp>").appendTo(infoCtn);
            Object.keys(action.info).forEach(key => {
                var value = action.info[key];
                if(typeof value !== 'object') {
                    $("<strong>").text(key + ":").appendTo(infoList);
                    $("<span>").html(` ${value}<br>`).appendTo(infoList);
                }
            })
            var seeMoreLink = $("<a>").attr("role", "button").addClass("see-more-toggle").attr("data-toggle", "collapse").attr("href", `#${id}`).attr("aria-expanded", "false").attr("aria-controls", id).text("See more").appendTo(moreInfoCtn);
            infoCtn.on("show.bs.collapse", () => seeMoreLink.text("See less")).on("hide.bs.collapse", () => seeMoreLink.text("See more"))
        }
    }
    var text = `${username} ${actionTxt}${sentenceEnd}</span>.${otherLines}`;
    if(typeof actionTemplate.requiresModerator !== 'undefined' && actionTemplate.requiresModerator) {
        var modUsername = "<strong>Deleted moderator</strong>"
        if(action.moderatingUser) modUsername = renderUsernameText(action.moderatingUser);
        var text = `${modUsername} ${actionTxt} ${username}${sentenceEnd}</span>.${otherLines}`
    }
    $("<p>").addClass("text").html(text).appendTo(row);
    if(moreInfoCtn) moreInfoCtn.appendTo(row);
    $("<time>").addClass("timeago").attr("datetime", action.date).attr("title", new Date(action.date).toLocaleString()).text($.timeago(action.date)).appendTo(row);
    return row;
}

function fetchActions(lastID, modOnly, limit, firstID, callback) {
    $.get("/api/mod/actions", {lastID: lastID, firstID: firstID, limit: limit, modOnly: modOnly}).done(function(data) {
        if(!data.success || !data.actions || !data.actionTemplates) return callback(null);
        actionTemplates = data.actionTemplates;
        callback(data.actions, data.lastID);
        $(".timeago").timeago();
    }).fail(function() {
        callback(null, null);
    });
}

function addToContainerForResponse(container, data, lastID, modOnly, limit, allowsShowMore) {
    data.forEach(action => getRowForAction(action).appendTo(container));
    if(allowsShowMore && lastID) {
        var loading = false;
        $("<a>").addClass("btn btn-primary btn-xs").text("Load more").appendTo(container).on("click", function() {
            var btn = $(this);
            if(!loading) {
                loading = true;
                btn.html("<i class=\"fa fa-spin fa-circle-o-notch\"></i> Loading…").addClass("disabled");
                fetchActions(lastID, modOnly, limit, null, function(data, lastID) {
                    if(!data) {
                        loading = false;
                        return alert("Couldn't load more actions.")
                    }
                    btn.remove();
                    addToContainerForResponse(container, data, lastID, modOnly, limit, allowsShowMore);
                })
            }
        })
    }
}

function loadRecentActionsIntoContainer(container, limit = null, modOnly = false, allowsShowMore = true) {
    container.html("<i class=\"fa fa-spin fa-circle-o-notch\"></i> Loading…");
    fetchActions(null, modOnly, limit, null, function(data, lastID) { 
        if(!data) return $(container).text("Couldn't load mod actions");
        container.html("");
        addToContainerForResponse(container, data, lastID, modOnly, limit, allowsShowMore);
        var refreshFirstID = data.length > 0 ? data[0].id : null;
        setInterval(function() {
            fetchActions(null, modOnly, limit, refreshFirstID, function(data, lastID) {
                if(data.length > 0) refreshFirstID = data[0].id;
                data.reverse().forEach(action => getRowForAction(action).prependTo(container));
            });
        }, 1000)
    });
}
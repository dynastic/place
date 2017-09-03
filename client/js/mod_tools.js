var defaultBanReason = "";
var actionTemplates = null;

var BroadcastDialogController = DialogController($("#broadcast-dialog"));

var actions = {
    user: {
        similar: {
            btnStyle: "default",
            type: "link",
            getLinkURL: (data) => `/admin/users/similar/${data.id}`,
            buttonText: (data) => "View Similar"
        },
        ban: {
            url: "mod/toggle_ban",
            btnStyle: "danger",
            getRequestData: function(elem) {
                return new Promise((resolve, reject) => {
                    if(elem.attr("data-user-banned") === "true") return resolve({});
                    bootbox.prompt({
                        title: "Enter a ban reason",
                        value: defaultBanReason,
                        callback: function (reason) {
                            if(reason == null) return reject();
                            if(reason.length <= 3) return reject("Your ban reason must be over three characters long.");
                            resolve({reason: reason});
                        },
                        buttons: {
                            confirm: {
                                label: "Ban",
                                className: "btn-danger"
                            },
                            cancel: {
                                label: "Cancel",
                                className: "btn-default"
                            }
                        },
                    });

                })
            },
            buttonText: (data) => data.banned ? "Unban" : "Ban",
            getAttributes: function(data) {
                return {"data-user-banned": data.banned};
            },
        },
        activation: {
            url: "mod/toggle_active",
            btnStyle: "warning",
            buttonText: (data) => data.deactivated ? "Activate" : "Deactivate",
        },
        forcePWReset: {
            url: "admin/force_pw_reset",
            btnStyle: "info",
            adminOnly: true,
            getRequestData: function(elem) {
                return new Promise((resolve, reject) => {
                    var id = elem.parent().attr("data-user-id");
                    if(!id) id = elem.parent().parent().attr("data-user-id");
                    bootbox.prompt({
                        title: "Password Reset Key (for login)",
                        size: "small",
                        callback: function (result) {
                            if(result == null) return reject();
                            resolve({key: result});
                        },
                        buttons: {
                            confirm: {
                                label: "Submit",
                                className: "btn-primary"
                            },
                            cancel: {
                                label: "Cancel",
                                className: "btn-default"
                            }
                        },
                    });
                })
            },
            shouldShow: (data) => !data.isOauth,
            buttonText: () => "Password Reset"
        },
        disableTOTP: {
            url: "admin/disable_totp",
            btnStyle: "info",
            adminOnly: true,
            shouldShow: (data) => data.hasTOTP,
            buttonText: () => "Disable 2FA"
        },
        editUserNotes: {
            url: "mod/user_notes",
            method: "POST",
            btnStyle: "primary",
            getRequestData: function(elem) {
                return new Promise((resolve, reject) => {
                    var id = elem.parent().attr("data-user-id");
                    if(!id) id = elem.parent().parent().attr("data-user-id");
                    placeAjax.get("/api/mod/user_notes", {id: id}, null).then((res) => {
                        bootbox.prompt({
                            title: "Edit user notes",
                            inputType: "textarea",
                            value: res.userNotes,
                            callback: function (result) {
                                if(result == null) return reject();
                                resolve({notes: result});
                            },
                            buttons: {
                                confirm: {
                                    label: "Save",
                                    className: "btn-primary"
                                },
                                cancel: {
                                    label: "Close",
                                    className: "btn-default"
                                }
                            },
                        });
                    }).catch((err) => reject("Couldn't fetch user notes: " + err));
                })
            },
            buttonText: (data) => "Edit User Notes"
        },
        mod: {
            url: "admin/toggle_mod",
            btnStyle: "success",
            adminOnly: true,
            buttonText: (data) => `${data.moderator ? "Remove" : "Give"} Moderator`
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
            buttonText: (data) => "Reload Config"
        },
        refreshClients: {
            url: "admin/refresh_clients",
            btnStyle: "danger",
            adminOnly: true,
            callback: (data, elem) => {
                elem.text(actions.server.refreshClients.buttonText(data));
                alert("Successfully refreshed all clients currently connected to websockets.")
            },
            buttonText: (data) => "Refresh All Clients"
        },
        broadcastMessage: {
            type: "event",
            btnStyle: "info",
            buttonText: (data) => "Broadcast Message",
            adminOnly: true,
            onClick: () => BroadcastDialogController.show()
        }
    }
};

var setActionDataOnElement = function(data, elem, action) {
    var title = action.buttonText(data);
    var shouldShow = true;
    if(typeof action["shouldShow"] === "function") shouldShow = action.shouldShow(data);
    var isPressed = false;
    var text = title;
    if(typeof action.icon === "function") text = `<i class="fa fa-${action.icon(data)}"></i>`
    if(elem.hasClass("dropdown-action")) text = `<span class="text-${action.btnStyle}">${text}</span>`
    if(typeof action.isActive === "function") isPressed = action.isActive(data);
    if(isPressed) elem.addClass("active")
    else elem.removeClass("active");
    if(shouldShow) elem.removeClass("hidden");
    else elem.addClass("hidden");
    elem.html(text);
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

var actionIDs = Object.keys(actions.user);

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
    actionIDs.forEach((a) => renderAction(a, user, "user").appendTo(actionCtn));
    return actionCtn[0].outerHTML;
}

var renderServerActions = function() {
    var actionContainer = $("<div>").addClass("action-ctn");
    Object.keys(actions.server).forEach((key) => renderAction(key, {}, "server").appendTo(actionContainer));
    return actionContainer[0].outerHTML;
}

var renderUserActionsDropdown = function(user) {
    if(!canTouchUser(user)) return "";
    var dropdownCtn = $("<div>").addClass("dropdown dropdown-inline user-action-dropdown-ctn").attr("data-user-id", user.id);
    var btn = $("<a>").addClass("dropdown-toggle").attr({type: "button", "data-toggle": "dropdown", "aria-haspopup": true, "aria-expanded": false}).html("<span class=\"caret\"></span>").appendTo(dropdownCtn);
    var dropdownList = $("<ul>").addClass("dropdown-menu").attr("data-user-id", user.id).appendTo(dropdownCtn);
    actionIDs.forEach((a) => renderAction(a, user, "user", true).appendTo(dropdownList));
    return dropdownCtn[0].outerHTML;
}

var updateUserDropdowns = function(user) {
    $(`div.user-action-dropdown-ctn[data-user-id="${user.id}"]`).html($(renderUserActionsDropdown(user))[0].innerHTML);
}

$("body").on("click", ".user-action-btn", function() {
    var userID = $(this).parent().data("user-id");
    if(!userID) userID = $(this).parent().parent().data("user-id");
    var action = actions.user[$(this).data("user-action")];
    var elem = $(this);
    var method = "GET";
    if(typeof action.method !== "undefined") method = action.method;
    function continueWithRequestData(data) {
        var originalText = elem.html();
        elem.addClass("disabled").html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
        placeAjax.ajax({
            url:`/api/${action.url}/?id=${userID}`,
            method: method,
            data: data
        }, "An unknown error occurred while trying to perform actions on user.", () => {
            elem.removeClass("disabled");
            if(action.callbackModifiesText === false) elem.html(originalText);
        }).then((data) => {
            if(typeof action.callback === "function") action.callback(data.user, elem);
            setActionDataOnElement(data.user, elem, action);
            updateUserDropdowns(data.user);
            if(typeof action.getAttributes === "function") elem.attr(action.getAttributes(data));
        }).catch(() => {});
    }
    if(typeof action.getRequestData === "function") action.getRequestData($(this)).then((d) => continueWithRequestData(d)).catch((err) => { if(err) window.alert(err) });
    else continueWithRequestData({});
});

$("body").on("click", ".server-action-btn", function() {
    var action = actions.server[$(this).data("server-action")];
    var data = {};
    if(action.type == "event" && typeof action.onClick === "function") return action.onClick($(this));
    if(typeof action.getRequestData === "function") data = action.getRequestData($(this));
    if(!data) return;
    var originalText = $(this).html();
    $(this).addClass("disabled");
    $(this).html(`<i class="fa fa-circle-o-notch fa-spin"></i> ${originalText}`);
    var elem = $(this);
    placeAjax.get(`/api/${action.url}/`, data, "Couldn't perform action.", () => {
        elem.removeClass("disabled");
        if(action.callbackModifiesText === false) elem.html(originalText);
    }).then((data) => {
        action.callback(data, elem);
        if(typeof action.getAttributes === "function") elem.attr(action.getAttributes(data));
    }).catch(() => {});
});

$("#broadcastForm").submit(function(e) {
    e.preventDefault();
    var submitBtn = $(this).find("button[type=submit]").text("Broadcasting...").attr("disabled", "disabled");
    placeAjax.post("/api/admin/broadcast", {
        title: $(this).find("#inputBroadcastTitle").val(),
        message: $(this).find("#inputBroadcastMessage").val(),
        style: $(this).find("#inputBroadcastStyle").val(),
        timeout: $(this).find("#inputBroadcastTimeout").val()
    }, "An unknown error occurred while trying to send your broadcast.", () => submitBtn.text("Broadcast").removeAttr("disabled")).then((data) => {
        BroadcastDialogController.hide();
        window.alert("Successfully sent out broadcast to all connected clients.");
    }).catch(() => {});
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
        return eval("`" + template.replace(/\${/g, "${action.info.") + "`");
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
        if(typeof actionTemplate.sentenceEndTextFormatting !== "undefined") sentenceEnd = parseActionTemplate(actionTemplate.sentenceEndTextFormatting, action);
        if(typeof actionTemplate.otherLinesTextFormatting !== "undefined") otherLines = "<br>" + parseActionTemplate(actionTemplate.otherLinesTextFormatting, action);
        if(typeof actionTemplate.hideInfo === "undefined" || !actionTemplate.hideInfo) {
            var moreInfoCtn = $("<div>").addClass("info-collapse-ctn");
            var id = `info-collapse-${randomString(16)}-${action.id}`;
            var infoCtn = $("<div>").addClass("collapse info-collapse").attr("id", id).appendTo(moreInfoCtn);
            var infoList = $("<samp>").appendTo(infoCtn);
            Object.keys(action.info).forEach((key) => {
                var value = action.info[key];
                if(typeof value !== "object") {
                    $("<strong>").text(key + ":").appendTo(infoList);
                    $("<span>").html(` ${value}<br>`).appendTo(infoList);
                }
            })
            var seeMoreLink = $("<a>").attr("role", "button").addClass("see-more-toggle").attr("data-toggle", "collapse").attr("href", `#${id}`).attr("aria-expanded", "false").attr("aria-controls", id).text("See more").appendTo(moreInfoCtn);
            infoCtn.on("show.bs.collapse", () => seeMoreLink.text("See less")).on("hide.bs.collapse", () => seeMoreLink.text("See more"))
        }
    }
    var text = `${username} ${actionTxt}${sentenceEnd}</span>.${otherLines}`;
    if(typeof actionTemplate.requiresModerator !== "undefined" && actionTemplate.requiresModerator) {
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
    placeAjax.get("/api/mod/actions", {lastID: lastID, firstID: firstID, limit: limit, modOnly: modOnly}, null).then((data) => {
        actionTemplates = data.actionTemplates;
        callback(data.actions, data.lastID);
        $(".timeago").timeago();
    }).catch(() => callback(null));
}

function addToContainerForResponse(container, data, lastID, modOnly, limit, allowsShowMore) {
    data.forEach((action) => getRowForAction(action).appendTo(container));
    if(allowsShowMore && lastID) {
        var loading = false;
        $("<a>").addClass("btn btn-popping btn-xs").text("Load more").appendTo(container).on("click", function() {
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
                data.reverse().forEach((action) => getRowForAction(action).prependTo(container));
            });
        }, 1000)
    });
}

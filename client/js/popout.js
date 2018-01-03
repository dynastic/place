window.mobileAndTabletCheck = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

function PopoutVisibilityController(popoutContainer) {
    var controller = {
        popoutContainer: popoutContainer,
        tabChangeCallback: null, visibilityChangeCallback: null,

        _setup: function() {
            var p = this;
            $(this.popoutContainer).find("input").attr("disabled", "disabled");
            $(this.popoutContainer).find(".tabbar > .tab").click(function() {
                p.changeTab($(this).data("tab-name"));
            });
            $(this.popoutContainer).find(".navigation-bar .close-btn").click(function() {
                p.close();
            });
            if(window.mobileAndTabletCheck()) $(this.popoutContainer).find(".navigation-bar .popout-btn").hide();
            $(this.popoutContainer).find(".navigation-bar .popout-btn").click(function() {
                if($("body").hasClass("is-popped-out")) {
                    window.close();
                } else {
                    console.log(p.activeTab);
                    var w = window.open("/popout#" + p.activeTab, "Place_Popout", "directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=350,height=" + window.height);
                    if (window.focus) {w.focus()}
                    $("body").addClass("popped-out");
                    if(p.visibilityChangeCallback) p.visibilityChangeCallback();
                    w.onunload = function() {
                        setTimeout(function() {
                            if(w.closed) {
                                $("body").removeClass("popped-out");
                                if(p.visibilityChangeCallback) p.visibilityChangeCallback();
                            }
                        }, 1);
                    }
                }
            });
        },

        changeTab: function(name) {
            var p = this;
            p.activeTab = name;
            $(this.popoutContainer).find(".tab-content.active, .tab.active").removeClass("active");
            $(this.popoutContainer).attr("data-selected-tab", name);
            $(this.popoutContainer).find(`.tab-content[data-tab-name=${name}], .tab[data-tab-name=${name}]`).addClass("active").each(function() {
                if($(this).attr("title")) {
                    p._adjustTitle($(this).attr("title"));
                    return false;
                }
            });
            if(this.tabChangeCallback) this.tabChangeCallback(name);
            if($("body").hasClass("is-popped-out")) {
                window.location.hash = "#" + name;
            }
        },

        _adjustTitle: function(title) {
            $(this.popoutContainer).find(".navigation-bar > .title").text(title);
        },

        open: function() {
            $("body").addClass("popout-open");
            $(this.popoutContainer).find("input").removeAttr("disabled");
            if(this.visibilityChangeCallback) this.visibilityChangeCallback();
        },
        close: function() {
            $(this.popoutContainer).find("input").attr("disabled", "disabled");
            if($("body").hasClass("is-popped-out")) {
                window.close();
                if(window.opener.place) window.opener.place.popoutController.popoutVisibilityController.close();
            } else {
                $("body").removeClass("popout-open");
                if(this.visibilityChangeCallback) this.visibilityChangeCallback();
            }
        },
        toggle: function() {
            $("body").toggleClass("popout-open");
            if(this.visibilityChangeCallback) this.visibilityChangeCallback();
        }
    };
    controller._setup();
    return controller;
}

var popoutController = {
    isOutdated: false, place: null,
    messages: [], activeUsers: [], leaderboard: [],

    setup: function(place, popoutContainer) {
        this.popoutVisibilityController = PopoutVisibilityController(popoutContainer);
        this.popoutVisibilityController.tabChangeCallback = (name) => {
            if(name == "chat") this.scrollToChatBottom();
            else $(".tab-content.active").scrollTop(0);
        }
        this.place = place;
        var p = this;

        this.setupChat();
        this.loadLeaderboard();
        this.loadActiveUsers();
        setInterval(function() { p.loadLeaderboard() }, 1000 * 60 * 3);
        setInterval(function() { p.loadActiveUsers() }, 90000);

        this.startSocketConnection();
    },

    startSocketConnection: function() {
        var socket = place.socket || new WebSocket(`ws${window.location.protocol === "https:" ? "s" : ""}://${window.location.host}`);

        socket.onJSON("new_message", (data) => {
            this.loadActiveUsers();
            this.addChatMessage(data);
        });
        return socket;
    },

    setupChat: function() {
        var app = this;
        this.loadChatMessages();
        $("#chat-send-btn").click(function() {
            app.sendChatMessage();
        })
        $("#chat-input-field").focus(function() {
            if(!app.ignoreChatFocus) app.scrollToChatBottom();
            app.ignoreChatFocus = false;
        })
        $("#chat-input-field").keydown(function(e) {
            if((e.keyCode || e.which) != 13) return;
            app.sendChatMessage();
        })
    },
    
    loadChatMessages: function() {
        var app = this;
        placeAjax.get("/api/chat", null, null).then((response) => {
            app.messages = response.messages;
            app.layoutMessages();
        }).catch((err) => console.log("Failed to load chat messages.", err));
    },

    layoutMessages: function(alwaysScrollToBottom = true) {
        function getFancyDate(date) {
            var now = new Date();
            var almostSameDate = now.getMonth() == date.getMonth() && now.getFullYear() == date.getFullYear();
            var isToday = now.getDate() == date.getDate();
            var isYesterday = !isToday && now.getDate() == date.getDate() - 1;
            return `${isToday ? "Today" : (isYesterday ? "Yesterday" : date.toLocaleDateString())}, ${date.toLocaleTimeString()}`
        }
        var prevHeight = null;
        if(!alwaysScrollToBottom) prevHeight = $("#chat-messages")[0].scrollHeight;
        var oldScrollTop = $("#chat-messages").scrollTop();
        $("#chat-messages > *").remove();
        var sinceLastTimestamp = 0;
        const maxMessageBlock = 10;
        this.messages.forEach((item, index, arr) => {
            var outgoing = $("body").data("user-id") == item.userID;
            // Check if this message is not the first
            var hasLastMessage = index > 0;
            // Get the date of the last message, if possible
            var lastMessageDate = null;
            if(hasLastMessage) lastMessageDate = new Date(arr[index - 1].date);
            var messageDate = new Date(item.date);
            // Check if this message has an attached user
            var hasUser = !!item.user;
            if(typeof item.userError === "undefined") item.userError = null;
            // Determine if this message should have a timestamp before it (they appear for first messages, every 10 messages without a timestamp, after 3 minute breaks, or if messages were sent on different days)
            var needsTimestamp = sinceLastTimestamp > 10 || !hasLastMessage || (messageDate - lastMessageDate > 1000 * 60 * 3) || (messageDate.toDateString() !== lastMessageDate.toDateString());
            // Determine if this message should show a username (checks if its not sent my user and if it is the first message sent, or if the message before it was sent by someone else)
            var needsUsername = !outgoing && (needsTimestamp || !hasLastMessage || arr[index - 1].userID != item.userID);
            // Determine if this message should show a coordinate (if its the last message, the previous message was sent by someone else, or separated by three minutes)
            var needsCoordinate = index >= arr.length - 1 || (arr[index + 1].userID != item.userID || new Date(arr[index + 1].date) - messageDate > 1000 * 60 * 3 || sinceLastTimestamp == 10);
            // Calculate our maximum message blocks
            if(sinceLastTimestamp > 10) sinceLastTimestamp = 0;
            if(!needsTimestamp) sinceLastTimestamp++;
            if(needsTimestamp) $(`<div class="timestamp"></div>`).text(getFancyDate(new Date(item.date))).appendTo("#chat-messages");
            var ctn = $(`<div class="message-ctn"><div class="clearfix"><div class="message"></div></div></div>`).addClass(outgoing ? "outgoing" : "incoming");
            var usernameHTML = $("<div class=\"username-ctn\"><a class=\"username\"><span></span></a></div>");
            usernameHTML.find("span").text(hasUser ? item.user.username : this.place.getUserStateText(item.userError))
            if(item.user && typeof renderUserActionsDropdown === "function") {
                $(renderUserActionsDropdown(item.user)).appendTo(usernameHTML);
            }
            if(hasUser) {
                usernameHTML.find("a.username").attr("href", `/@${item.user.username}`);
                item.user.badges.filter((badge) => !badge.lowPriority && badge.inlineBefore).forEach((badge) => renderBadge(badge, true).prependTo(usernameHTML.find("a.username")));
                item.user.badges.filter((badge) => !badge.lowPriority && !badge.inlineBefore).forEach((badge) => renderBadge(badge, true).appendTo(usernameHTML.find("a.username")));
            } else usernameHTML.find("a.username").addClass("deleted-account");
            if(needsUsername) usernameHTML.prependTo(ctn);
            ctn.find(".message").text(item.text).attr("title", messageDate.toLocaleString());
            if(needsCoordinate) {
                var coords = $(`<a class="chat-coordinates" href="javascript:void(0);"><i class="fa fa-map-marker"></i> <span></span></a>`).click(() => {
                    this.place.zoomIntoPoint(item.position.x, item.position.y, false);
                    if($("body").hasClass("is-popped-out") && window.opener) window.opener.focus();
                });
                coords.find("span").text(`(${item.position.x.toLocaleString()}, ${item.position.y.toLocaleString()})`);
                coords.appendTo(ctn);
            }
            ctn.appendTo("#chat-messages");
        });
        this.scrollToChatBottom(prevHeight, oldScrollTop);
    },

    addChatMessage: function(message) {
        if(this.messages.map((m) => m.id).indexOf(message.id) < 0) {
            this.messages.push(message);
            this.layoutMessages($("body").data("user-id") == message.userID);
        }
    },

    scrollToChatBottom: function(checkScrollOffset = null, oldScrollTop = null) {
        var msgs = $("#chat-messages");
        if(!checkScrollOffset || oldScrollTop + 100 >= checkScrollOffset - msgs.innerHeight()) {
            msgs.scrollTop(msgs[0].scrollHeight);
        }
    },

    showTextOnTab: function(tabSelector, text) {
        var tab = $(`.tab-content[data-tab-name=${tabSelector}]`);
        tab.html("");
        $("<div>").addClass("coming-soon").text(text).appendTo(tab);
    },

    sendChatMessage: function() {
        var app = this;
        var input = $("#chat-input-field");
        var btn = $("#chat-send-btn");
        if(input.val().length <= 0) return;
        btn.text("Sending…").attr("disabled", "disabled");
        console.log()
        var coords = this.place.getCoordinates();
        var text = input.val();
        placeAjax.post("/api/chat", {text: text, x: coords.x, y: coords.y}, "An unknown error occurred while trying to send your chat message.", () => {
            btn.text("Send").removeAttr("disabled");
        }).then((response) => {
            app.ignoreChatFocus = true;
            app.loadActiveUsers();
            input.val("");
            input.focus();
            if(response.message) app.addChatMessage(response.message);
        }).catch(() => {});
    },

    loadLeaderboard: function() {
        var app = this;
        placeAjax.get("/api/leaderboard", null, null).then((response) => {
            app.leaderboard = response.leaderboard;
            if(response.lastUpdated) app.leaderboardUpdated = new Date(response.lastUpdated);
            app.layoutLeaderboard();
        }).catch((err) => {
            console.log("Failed to load leaderboard data.", err);
            app.showTextOnTab("leaderboard", "Failed to load");
        });
    },

    layoutLeaderboard: function() {
        function getStatElement(name, value) {
            var elem = $("<div>");
            $("<span>").addClass("value").text(value).appendTo(elem);
            $("<span>").addClass("name").text(name).appendTo(elem);
            return elem;
        }
        var tab = $("#leaderboardTab");
        tab.find("*").remove();
        if(!this.leaderboard) return this.showTextOnTab("leaderboard", "Loading…");
        if(this.leaderboard.length <= 0) return this.showTextOnTab("leaderboard", "No leaderboard data");
        var topPlace = $(`<div class="top-place"><i class="fa fa-trophy big-icon"></i><span class="info">Leader</span></div>`).appendTo(tab);
        var userInfo = $("<div>").addClass("leader-info").appendTo(topPlace);
        $("<a>").addClass("name").attr("href", `/@${this.leaderboard[0].username}`).text(this.leaderboard[0].username).appendTo(userInfo);
        $("<span>").addClass("pixel-label").text("Pixels placed").appendTo(userInfo);
        var subdetails = $("<div>").addClass("subdetails row-fluid clearfix").appendTo(userInfo);
        getStatElement("This week", this.leaderboard[0].statistics.placesThisWeek.toLocaleString()).addClass("col-xs-6").appendTo(subdetails);
        getStatElement("Total", this.leaderboard[0].statistics.totalPlaces.toLocaleString()).addClass("col-xs-6").appendTo(subdetails);
        if(this.leaderboard.length > 1) {
            this.leaderboard.forEach((item, index) => {
                if(index > 0) {
                    var table = $("<table>").addClass("table table-contained").appendTo($("<div>").addClass("user compact").appendTo($("<a>").attr("href", `/@${item.username}`).appendTo(tab)));
                    var row = $("<tr>").appendTo(table);
                    $("<td>").addClass("bold").text(`${index + 1}.`).appendTo(row);
                    $("<a>").text(item.username).attr("href", `/@${item.username}`).appendTo($("<td>").appendTo(row));
                    var info1 = $("<td>").addClass("stat").appendTo(row);
                    $("<span>").text(item.statistics.placesThisWeek.toLocaleString()).appendTo(info1);
                    $("<span>").text("This week").addClass("row-label").appendTo(info1);
                    var info2 = $("<td>").addClass("stat").appendTo(row);
                    $("<span>").text(item.statistics.totalPlaces.toLocaleString()).appendTo(info2);
                    $("<span>").text("Total").addClass("row-label").appendTo(info2);
                }
            });
        }
        if(this.leaderboardUpdated) $("<small>").addClass("last-update").text(`Last updated at ${this.leaderboardUpdated.toLocaleString()}.`).appendTo(tab);
        $("<p>").addClass("text-muted").text("Leaderboards are calculated based on the number of pixels you have placed (that someone else hasn't overwritten) over the span of the last week. To get a spot on the leaderboard, start placing!").appendTo(tab);
    },

    loadActiveUsers: function() {
        var app = this;
        placeAjax.get("/api/active-now", null, null).then((response) => {
            app.activeUsers = response.active;
            app.layoutActiveUsers();
        }).catch((err) => {
            console.error("Failed to load active user data.", err);
            app.showTextOnTab("active-users", "Failed to load");
        });
    },

    layoutActiveUsers: function() {
        if(this.activeUsers.length <= 0) return this.showTextOnTab("active-users", "No Active Users");
        var tab = $("#activeUsersTab");
        tab.find("*").remove();
        var usersCtn = $(`<div>`).appendTo(tab);
        this.activeUsers.forEach((item, index) => {
            var row = $("<div>").addClass("user-info").appendTo($("<div>").addClass("user").appendTo(usersCtn));
            $("<a>").text(item.username).addClass("username").attr("href", `/@${item.username}`).appendTo(row);
            if(item.badges && item.badges.length > 0) {
                var badgeCtn = $("<div>").addClass("rank-container").appendTo(row);
                item.badges.filter((badge) => !badge.isLowRanking).forEach((badge) => renderBadge(badge, false).appendTo(badgeCtn));
            }
            var lastSeen = $("<span>").text("Last seen ").addClass("last-seen").appendTo(row);
            var date = item.statistics.lastSeenActively;
            $("<time>").attr("datetime", date).attr("title", new Date(date).toLocaleString()).text($.timeago(date)).appendTo($("<strong>").appendTo(lastSeen));
        });
        $("<p>").addClass("text-muted").text("Users that are both logged in and have either placed a pixel or sent a chat message in the last five minutes will appear here. This tab is updated once a minute, so data may appear delayed.").appendTo(tab);
    },

    isInPopOutWindow: function() {
        return $("body").hasClass("is-popped-out");
    }
};

if($("body").hasClass("is-popped-out")) {
    if(window.opener.place) {
        popoutController.setup(window.opener.place, $("#popout-container")[0]);
        popoutController.popoutVisibilityController.tabChangeCallback = (name) => {
            window.opener.place.popoutController.popoutVisibilityController.changeTab(name);
        }
        window.opener.onunload = () => {
            setTimeout(function() {
                if(!window.opener || window.opener.closed) window.close();
            }, 1);
        }
    }

    $(document).ready(function(e) {
        if(window.location.hash && window.location.hash != "#") popoutController.popoutVisibilityController.changeTab(window.location.hash.substring(1));
    })
}
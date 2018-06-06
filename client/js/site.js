$.ajaxSetup({
	headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
});

var renderBadge = function(badge, prefersShortText = false) {
	var badge = $("<span>").addClass(`label badge-label label-${badge.style || "default"}`).text(prefersShortText && badge.shortText ? badge.shortText : badge.text);
	if(badge.title) badge.attr("title", badge.title);
	return badge;
}

var hashHandler = {
    getHash: function() {
        return this.decodeHash(window.location.hash);
    },

    setHash: function(hash) {
        var encodedHash = this.encodeHash(hash);
        if("history" in window) window.history.replaceState(undefined, undefined, "#" + encodedHash);
        else location.replace("#" + encodedHash);
    },

    modifyHash: function(newHash) {
        this.setHash(Object.assign(this.getHash(), newHash));
    },

    deleteHashKey: function(keys) {
        var keysToUse = keys;
        if(typeof keys == "string") keysToUse = [keys];
        var hash = this.getHash();
        keysToUse.forEach((key) => delete hash[key]);
        this.setHash(hash);
    },

    decodeHash: function(hashString) {
        if(hashString.indexOf("#") === 0) hashString = hashString.substring(1);
        if (hashString.length <= 0) return {};
        var hashArguments = hashString.split("&");
        var decoded = {};
        hashArguments.forEach(function(hashArg) {
            var parts = hashArg.split("=");
            var key = parts[0], value = decodeURIComponent(parts[1]);
            if(key) decoded[key] = value;
        });
        return decoded;
    },

    encodeHash: function(hash) {
        return $.param(hash);
    }
}

function DialogController(dialog) {
    return {
        dialog: dialog,
        currentTab: null,
        isAnimating: false,

        setup: function() {
            var me = this;
            me.dialog.parent().find(".dialog .close, .dialog-overlay").click(function() {
                me.hide();
            });
            me.dialog.find(".switchers > div").click(function() {
                var id = $(this).attr("tab-name");
                me.switchTab(id);
            });
            $(document).keydown(function(e) {
                if(me.isShowing() && e.keyCode == 27) { // escape
                    e.preventDefault();
                    me.hide();
                }
            })
            me.dialog.on("click", "[data-dialog-dismiss]", function() {
                me.hide();
            })
            me.dialog.find("form.form-signin").submit(function(e) {
                e.preventDefault();
                var form = $(this);
                var call = form.attr("action");
                var tab = form.parent().attr("tab-name");
                var data = form.serialize();
                if(form.data("submitting")) return;
                var submitButton = form.find("input[type=submit], button[type=submit]");
                var origSubmitButtonText = submitButton.text();
                submitButton.text("Loading").attr("disabled", "disabled");
                form.data("submitting", true);
                placeAjax.post("/api" + call, data, null, () => {
                    submitButton.removeAttr("disabled");
                    if(origSubmitButtonText) submitButton.text(origSubmitButtonText);
                    form.data("submitting", false);
                }).then((data) => {
                    var hash = hashHandler.getHash();
                    var redirectURL = hash["redirectURL"];
                    const absoluteURLRegex = new RegExp('^(?:[a-z]+:)?(//)?', 'i');
                    if(redirectURL && redirectURL != "/" && !absoluteURLRegex.test(redirectURL)) {
                        window.location.href = redirectURL;
                    } else {
                        window.location.reload();
                    }
                }).catch((err) => {
                    if(tab == "sign-in" && err && err.code == "totp_needed") {
                        $("#inputUsername2FA").val(form.find("#inputUsername").val());
                        $("#inputPassword2FA").val(form.find("#inputPassword").val());
                        $("#inputKeepSignIn2FA").prop("checked", form.find("#inputKeepSignIn").is(":checked"));
                        me.switchTab("2fa-auth");
                        return;
                    }
                    if(tab == "sign-up" && typeof grecaptcha !== "undefined") grecaptcha.reset();
                    me.shake();
                    var error = "An unknown error occurred while attempting to authenticate you.";
                    if(err && err.message) error = err.message;
                    me.showErrorOnTab(tab, error);
                });
            });
            return me;
        },

        isShowing: function() {
            return this.dialog.parent().hasClass("show");
        },

        shake: function() {                
            this.dialog.addClass("shake");
            setTimeout(() => { this.dialog.removeClass("shake"); }, 500);
        },

        showErrorOnTab: function(tab, text = null) {
            var tabContent = this.dialog.find(`.pages > div[tab-name=${tab}]`);
            if(text) {
                // show error
                var existing = tabContent.find(".tab-error");
                if(existing.length > 0) {
                    existing.find("span").text(text);
                    return;
                }
                var alert = $("<div>").addClass("tab-error alert alert-danger").hide().appendTo(tabContent).fadeIn();
                $("<strong>").text("Uh oh! ").appendTo(alert);
                $("<span>").text(text).appendTo(alert);
            } else {
                tabContent.find(".tab-error").remove();
            }
        },

        switchTab: function(tab, animated = true) {
            if(tab == this.currentTab || this.isAnimating) return;
            this.dialog.find(`.pages > div:not([tab-name=${tab}]) .tab-error`).remove();
            this.currentTab = tab;
            this.isAnimating = true;
            var hidesSwitchers = this.dialog.find(`.pages > div[tab-name=${tab}]`).hasClass("hides-switchers");
            var applyClasses = () => {
                this.isAnimating = false;
                this.dialog.find(".pages > div.active, .switchers > div.active").removeClass("active");
                this.dialog.find(".switchers").removeClass("hidden");
                this.dialog.find(`.pages > div[tab-name=${tab}], .switchers > div[tab-name=${tab}]`).addClass("active");
                if(hidesSwitchers) $(`.switchers`).addClass("hidden");
            }
            if(animated) {
                const animDuration = 250;
                var toHide = $(`.pages > div.active, .switchers${hidesSwitchers ? "" : ` > div[tab-name=${tab}]`}`).animate({opacity: 0}, {duration: animDuration, queue: false}).slideUp({duration: animDuration, queue: false, complete: function() {
                    $(this).attr("style", "");
                    applyClasses();
                }});
                this.dialog.find(".switchers").removeClass("hidden");
                $(`.pages > div[tab-name=${tab}], .switchers > div.active`).css({opacity: 1}).slideDown(animDuration, function() {
                    $(this).attr("style", "");
                });
            } else applyClasses();
        },

        show: function(tab = null) {
            if(this.isShowing()) return;
            if(tab) this.switchTab(tab, false);
            this.dialog.parent().addClass("show");
            hashHandler.modifyHash({"d": 1});
        },

        hide: function(){ 
            this.dialog.find(".tab-error").remove();
            if(this.currentTab == "2fa-auth") {
                this.dialog.find(".pages > .active form").trigger("reset");
                this.switchTab("sign-in");
                return;
            }
            this.dialog.find("form").trigger("reset");
            this.dialog.parent().removeClass("show");
            hashHandler.deleteHashKey("d");
        }
    }.setup();
}

const defaultErrorMessage = "An unknown error occurred while trying to make that request.";
var placeAjax = {
	ajax: function(data, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return new Promise((resolve, reject) => {
			function handleError(response) {
				if(defaultErrorMessage) window.alert(response && response.error ? (response.error.message || defaultErrorMessage) : defaultErrorMessage);
				reject(response ? response.error : null);
			}
			$.ajax(data).done(function(response) {
				if(!response.success) return handleError(response);
				resolve(response);
			}).fail((res) => handleError(typeof res.responseJSON === "undefined" ? null : res.responseJSON)).always(function() {
				if(typeof alwaysCallback == "function") alwaysCallback();
			})
		});
	},
	get: function(url, data = null, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return this.ajax({url: url, data: data, method: "GET"}, defaultErrorMessage, alwaysCallback);
	},
	post: function(url, data = null, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return this.ajax({url: url, data: data, method: "POST"}, defaultErrorMessage, alwaysCallback);
	},
	put: function(url, data = null, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return this.ajax({url: url, data: data, method: "PUT"}, defaultErrorMessage, alwaysCallback);
	},
	patch: function(url, data = null, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return this.ajax({url: url, data: data, method: "PATCH"}, defaultErrorMessage, alwaysCallback);
	},
	delete: function(url, data = null, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return this.ajax({url: url, data: data, method: "DELETE"}, defaultErrorMessage, alwaysCallback);
	},
	options: function(url, data = null, defaultErrorMessage = defaultErrorMessage, alwaysCallback = null) {
		return this.ajax({url: url, data: data, method: "OPTIONS"}, defaultErrorMessage, alwaysCallback);
	}
}

// Mobile Safari in standalone mode - from https://gist.github.com/kylebarrow/1042026
if(("standalone" in window.navigator) && window.navigator.standalone){

	// If you want to prevent remote links in standalone web apps opening Mobile Safari, change 'remotes' to true
	var noddy, remotes = false;
	
	document.addEventListener("click", function(event) {
		
		noddy = event.target;
		
		// Bubble up until we hit link or top HTML element. Warning: BODY element is not compulsory so better to stop on HTML
		while(noddy.nodeName !== "A" && noddy.nodeName !== "HTML") {
	        noddy = noddy.parentNode;
	    }
		
		if("href" in noddy && noddy.href.indexOf("http") !== -1 && (noddy.href.indexOf(document.location.host) !== -1 || remotes))
		{
			event.preventDefault();
			document.location.href = noddy.href;
		}
	
	}, false);
}

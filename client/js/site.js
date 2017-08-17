$.ajaxSetup({
	headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
});

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
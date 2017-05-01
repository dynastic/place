const marked = require("marked"),
      renderer = new marked.Renderer();

renderer.code = function(code, lang) {
    if (lang == 'lead') return '<p class="lead">' + code + '</p>';
    return new marked.Renderer().code.apply(this, arguments);
}

marked.setOptions({
    renderer: renderer
})

module.exports = marked;
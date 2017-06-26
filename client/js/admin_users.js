$(document).ready(function() {
    var table = $("#users").DataTable({
        processing: true,
        serverSide: true,
        aaSorting: [[2, "desc"]],
        pageLength: 25,
        ajax: { url: "/api/admin/users", type: "POST", contentType: "application/json", data: (d) => JSON.stringify(d) },
        columns: [
            { data: "name", defaultContent: "", render: (data) => `<a href="/@${data}">${data}</a>` },
            { data: "creationDate", defaultContent: "", render: (data, type, full) => new Date(data).toLocaleString() },
            { data: "lastPlace", defaultContent: "Never", render: (data, type, full) => data ? new Date(data).toLocaleString() : "Never" },
            { data: "placeCount", defaultContent: "0", render: (data, type, full) => data.toLocaleString() },
            { data: "actions", orderable: false }
        ],
        columnDefs: [{
            "targets": 4,
            "searchable": false,
            "orderable": false,
            "render": (data, type, full, meta) => renderUserActions(full)
        }],
        select: {
            style: "os",
            selector: "td:not(:first-child)" // no row selection on last column
        },
        serverParams: (data) => data.bChunkSearch = true
    }).columns().every( function () {
        var that = this;
        $("input[type=search]", this.footer() ).attr("spellcheck", "false").attr("autocomplete", "off").attr("autocorrect", "off").attr("autocapitalize", "off").on( "keyup change", function () {
            if (that.search() !== this.value) {
                that.search(this.value, true).draw();
            }
        });
    });
});
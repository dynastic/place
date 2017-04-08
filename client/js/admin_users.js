// Introducing: the worst code written in the history of mankind

$(document).ready(function() {
    $('table#users').DataTable({
        processing: true,
        serverSide: true,
        order: { column: 1, order: "desc" },
        ajax: { url: "/api/admin/users", type: "POST", contentType: "application/json", data: d => JSON.stringify(d) },
        columns: [
            { data: "name", defaultContent: "" },
            { data: "creationDate", defaultContent: "", render: (data, type, full) => new Date(data).toLocaleString() },
            { data: "lastPlace", defaultContent: "Never", render: (data, type, full) => data ? new Date(data).toLocaleString() : "Never" },
            { data: "placeCount", defaultContent: "0", render: (data, type, full) => data.toLocaleString() }
        ],
        serverParams: function(data) { data.bChunkSearch = true; }
    }).columns().every( function () {
        var that = this;
        $( 'input', this.footer() ).on( 'keyup change', function () {
            if ( that.search() !== this.value ) {
                that.search( this.value, true ).draw();
            }
        });
    });
});
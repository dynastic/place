$(document).ready(function() {
    var table = $('#users').DataTable({
        processing: true,
        serverSide: true,
        aaSorting: [[2, "desc"]],
        ajax: { url: "/api/admin/users", type: "POST", contentType: "application/json", data: d => JSON.stringify(d) },
        columns: [
            { data: "active", orderable: false },
            { data: "name", defaultContent: "" },
            { data: "creationDate", defaultContent: "", render: (data, type, full) => new Date(data).toLocaleString() },
            { data: "lastPlace", defaultContent: "Never", render: (data, type, full) => data ? new Date(data).toLocaleString() : "Never" },
            { data: "placeCount", defaultContent: "0", render: (data, type, full) => data.toLocaleString() }
        ],
        columnDefs: [{
            'targets': 0,
            'searchable': false,
            'orderable': false,
            'width': '1%',
            'className': 'dt-body-center',
            'render': (data, type, full, meta) => '<input type="checkbox">'
        }],
        select: {
            style: 'os',
            selector: 'td:not(:first-child)' // no row selection on last column
        },
        serverParams: data => data.bChunkSearch = true
    }).columns().every( function () {
        var that = this;
        $('input[type=search]', this.footer() ).on( 'keyup change', function () {
            if (that.search() !== this.value) {
                that.search(this.value, true).draw();
            }
        });
    });

    function updateSelectAllBox() {
        var checkedBoxes = $('#users tbody input[type="checkbox"]:checked');
        var allBoxes = $('#users tbody input[type="checkbox"]');
        var selectAll = $("#select-all")[0];

        if(checkedBoxes.length === 0) {
            selectAll.checked = false;
            if("indeterminate" in selectAll) selectAll.indeterminate = false;
        } else if (checkedBoxes.length === allBoxes.length) {
            selectAll.checked = true;
            if("indeterminate" in selectAll) selectAll.indeterminate = false;
        } else {
            selectAll.checked = true;
            if("indeterminate" in selectAll) selectAll.indeterminate = true;
        }
    }

    $('#select-all').click(function(e) {
        e.stopPropagation();
        $(`#users tbody input[type="checkbox"]:${this.checked ? "not(:": ""}checked${this.checked ? ")": ""}`).trigger('click');
    });

    table.on('draw', () => updateSelectAllBox());

    $('#users tbody').on('click', 'input[type="checkbox"]', e => {
        e.stopPropagation();
        updateSelectAllBox();
    });
});
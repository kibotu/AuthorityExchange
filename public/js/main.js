$(document).ready(function () {

    // fill hosts
    $.ajax({url:'/host-devices', success:function (data) {
        $("#hosts").append(data);
        $(".colorboxed").colorbox({overlayClose:false, speed:0});
    }});

    // fill devices
    $.ajax({url:'/devices', success:function (data) {
        $("#devices").append(data);
        $(".colorboxed").colorbox({overlayClose:false, speed:0});
    }});

    // add device colorbox
    $('a#add-device').colorbox({overlayClose:false, speed:0});

    var getSelectedIds = function (cb) {

        this.source = 0;

        // get selected host
        this.source = $('input[name="host"]:checked', '#hosts').val();
        // get selected devices
        var targets = this.targets = [];
        $('input:checkbox[name="devices"]:checked').each(function () {
            targets.push($(this).val());
        });
        cb({ selected_host:this.source, selected_devices:this.targets});
    };

    // create form of selected stuff
    $('#provide-devices').click(function (json) {

        var postmessage = function(json) {

            $.ajax({
                type:'POST',
                url:'/provide-devices',
                data:{
                    jsonData: json
                    // or jsonData: JSON.stringify(credentials)   (newest browsers only)
                },
                dataType:'json',
                statusCode: {
                    404: function() {
                        alert("something went wrong :D");
                    },
                    200: function(response) {
                        // success feedback message stuff
                        window.location = "/";
                    }
                },
                complete:function (validationResponse) {
                }
            });
        };

        getSelectedIds(postmessage);
    });
});
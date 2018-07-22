//to do: Node RED type definitions
declare var RED: any;

//
// -- amqp in --------------------------------------------------------------------------------------
//
RED.nodes.registerType("amqp3 in", {
    category: "input",
    defaults: {
        name: {
            value: ""
        },
        topic: {
            value: ""
        },
        iotype: {
            value: "4",
            required: true
        },
        exchange: {
            value: "",
            required: false,
            validate: function(val) {
                console.log('validate', $('select#node-input-iotype').val());
                if($('select#node-input-iotype').val() > 3) {
                    console.log('iotype > 3');
                    return true;
                } else if(typeof val === 'string' && val.length > 0) {
                    console.log('valid string');
                    return true;
                } else {
                    console.log('invalid');
                    return false;
                }
            }
        },
        queue: {
            value: "",
            required: false
        },
        server: {
            type: "amqp-server",
            required: true
        }
    },
    inputs: 0,
    outputs: 1,
    color: "#ff9933",
    icon: "bridge.png",
    label: function() {
        return this.name || this.ioname || "amqp";
    },
    labelStyle: function() {
        return this.name ? "node_label_italic" : "";
    },
    oneditprepare: function() {
        $('select#node-input-iotype').on('change', function() {
            console.log('on iotype change', $(this).val());
            $('input#node-input-exchange').trigger('change');
            if($(this).val() > 3) {
                $('input#node-input-exchange').prop('disabled', true);
            } else {
                $('input#node-input-exchange').prop('disabled', false);
            }
        });
    }
});

//to do: Node RED type definitions
declare var RED: any;

//
// -- amqp in --------------------------------------------------------------------------------------
//
RED.nodes.registerType("amqp3 in", {
    category: "input",
    defaults: {
        server: {
            type: "amqp-server",
            required: true
        },
        name: {
            value: "",
            required: true
        },
        itype: {
            value: "4",
            required: true
        },
        exchange: {
            value: "",
            required: false,
            validate: function(val) {
                // si le mode écoute d"une queue est activé
                // alors exchange n"est pas obligatoire
                if($("select#node-input-itype").val() > 3) {
                    return true;
                } else if(typeof val === "string" && val.length > 0) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        topic: {
            value: "",
            required: false,
            validate: function(val) {

                console.log('topic validate');
                console.log($("select#node-input-itype").val());
                console.log(val);

                // si le mode écoute d"une queue est activé
                // alors exchange n"est pas obligatoire
                if($("select#node-input-itype").val() > 3) {
                    return true;
                } else if(typeof val === "string" && val.length > 0) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        queue: {
            value: "",
            required: true
        }
    },
    inputs: 0,
    outputs: 1,
    color: "#ff9933",
    icon: "bridge.png",
    label: function() {
        return this.name || this.iname || "amqp";
    },
    labelStyle: function() {
        return this.name ? "node_label_italic" : "";
    },
    oneditprepare: function() {
        $("select#node-input-itype").on("change", function() {
            var isQueueType = ($(this).val() > 3);
            // on trigger la validation avant activation ou désactivation
            $("input#node-input-exchange, input#node-input-topic").trigger("change");
            $("input#node-input-exchange, input#node-input-topic").prop("disabled", isQueueType);
        });
    },
    onpaletteadd: function() {
        console.log('onpaletteadd', this);
    }
});

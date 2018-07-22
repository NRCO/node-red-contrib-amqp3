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
            value: "",
            required: false,
            validate: function(val) {
                // si le mode écoute d"une queue est activé
                // alors exchange n"est pas obligatoire
                if($("select#node-input-iotype").val() > 3) {
                    return true;
                } else if(typeof val === "string" && val.length > 0) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        iotype: {
            value: "4",
            required: true
        },
        exchange: {
            value: "",
            required: false,
            validate: function(val) {
                // si le mode écoute d"une queue est activé
                // alors exchange n"est pas obligatoire
                if($("select#node-input-iotype").val() > 3) {
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
        $("select#node-input-iotype").on("change", function() {
            var isQueueType = ($(this).val() > 3);
            // on trigger la validation avant activation ou désactivation
            $("input#node-input-exchange").trigger("change");
            $("input#node-input-exchange, input#node-input-topic").prop("disabled", isQueueType);
        });
    }
});

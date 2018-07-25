//to do: Node RED type definitions
declare var RED: any;

//
// -- amqp out -------------------------------------------------------------------------------------
//
RED.nodes.registerType("amqp3 out", {
    category: "output",
    defaults: {
        name: {
            value: ""
        },
        otype: {
            value: "4",
            required: true
        },
        server: {
            type: "amqp-server",
            required: true
        },
        exchange: {
            value: "",
            validate: function(val) {
                if(!this.changed) {
                    return true;
                } else {
                    // si le mode écoute d"une queue est activé
                    // alors exchange n"est pas obligatoire
                    if($("select#node-input-otype").val() > 3) {
                        return true;
                    } else if(typeof val === "string" && val.length > 0) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        topic: {
            value: "",
            validate: function(val) {
                if(!this.changed) {
                    return true;
                } else {
                    // si le mode écoute d"une queue est activé
                    // alors exchange n"est pas obligatoire
                    if($("select#node-input-otype").val() > 3) {
                        return true;
                    } else if(typeof val === "string" && val.length > 0) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        queue: {
            value: "",
            validate: function(val) {
                if(!this.changed) {
                    return true;
                } else {
                    // si le mode écoute d"une queue est activé
                    // alors exchange n"est pas obligatoire
                    if($("select#node-input-otype").val() <= 3) {
                        return true;
                    } else if(typeof val === "string" && val.length > 0) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        }
    },
    inputs: 1,
    outputs: 0,
    color: "#ff9933",
    icon: "bridge.png",
    align: "right",
    label: function() {
        return this.name || this.ioname || "amqp";
    },
    labelStyle: function() {
        return this.name ? "node_label_italic" : "";
    },
    oneditprepare: function() {
        $("select#node-input-otype").on("change", function() {
            var isQueueType = ($(this).val() > 3);
            // on trigger la validation avant activation ou désactivation
            $("input#node-input-topic, input#node-input-queue, input#node-input-exchange").trigger("change");
            $("input#node-input-exchange, input#node-input-topic").prop("disabled", isQueueType);
            $("input#node-input-queue").prop("disabled", !isQueueType);
        });
    }
});

//to do: Node RED type definitions
declare var RED: any;

//
// -- amqp in --------------------------------------------------------------------------------------
//
RED.nodes.registerType("amqp3 in", {
    category: "input",
    defaults: {
        name: { value: "" },
        topic: { value: "" },
        iotype: { value: "4", required: true },
        exchange: { value: "", required: true },
        queue: { value: "", required: true },
        server: { type: "amqp-server", required: true }
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
            alert("haha");
            if($(this).val() > 3) {
                $('div.input-exchange').prop('disabled', true);
            } else {
                $('div.input-exchange').prop('disabled', false);
            }
        });
    }
});

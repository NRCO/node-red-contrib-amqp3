import * as amqp from "amqp-ts";

module.exports = function(RED) {
    "use strict";

    const exchangeTypes = ["direct", "fanout", "headers", "topic"];

    function getServer(node) {
        return new Promise(function(resolve, reject) {
            if(!node.server) {
                reject(null);
            } else {
                resolve(node);
            }
        });
    }

    function initialize(node) {

        return getServer(node)
        .then(function() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
            return node.server.claimConnection();
        })
        .catch(function(err) {
            node.status({fill: "red", shape: "dot", text: "error"});
            node.error("AMQP " + node.amqpType + " error: missing AMQP server configuration");
        })
        .then(function() {

            node.on("close", function() {
                node.close()
                .then(function () {
                    node.server.freeConnection();
                    node.status({fill: "red", shape: "ring", text: "disconnected"});
                })
                .catch(function (err) {
                    node.server.freeConnection();
                    node.status({fill: "red", shape: "dot", text: "disconnect error"});
                    node.error("AMQP " + node.amqpType + " node disconnect error: " + err.message);
                });
            });

            return node.initialize();
        })
        .catch(function(err) {
            node.status({fill: "red", shape: "dot", text: "error"});
            node.error("AMQP " + node.amqpType + " error: " + err.message);
        })
        .then(function() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        });
    }

    function AmqpIn(n) {

        var queue,
            exchange,
            node = this;

        RED.nodes.createNode(node, n);

        node.source = n.source;
        node.topic = n.topic;
        node.ioType = n.iotype;
        node.ioName = n.ioname;
        node.server = RED.nodes.getNode(n.server);

        // set amqp node type initialization parameters
        node.amqpType = "input";
        node.src = null;

        node.sanitize = function(name) {
            return node.name.replace(/[^a-z0-9\-\.]+/gi, ".");
        }

        // node specific initialization code
        node.initialize = function () {

            // node.ioType is a string with the following meaning:
            // "0": direct exchange
            // "1": fanout exchange
            // "2": headers exchange
            // "3": topic exchange
            // "4": queue
            if(node.ioType === "4") {
                queue = node.server.connection.declareQueue(node.sanitize(node.ioName));
            } else {
                queue = node.server.connection.declareQueue(node.sanitize(node.name) || node.id);
                exchange = node.server.connection.declareExchange(node.ioName, exchangeTypes[node.ioType]);
                queue.bind(exchange, node.topic);
            }

            return queue.activateConsumer(
                function(msg) {
                    node.send({
                        topic: node.topic || msg.fields.routingKey,
                        payload: msg.getContent(),
                        amqpMessage: msg
                    });
                },
                {
                    noAck: true
                }
            )
        };

        node.close = function() {
            return queue.close();
        };

        initialize(node);
    }

    function AmqpOut(n) {
        var node = this;
        RED.nodes.createNode(node, n);

        node.source = n.source;
        node.topic = n.routingkey;
        node.ioType = n.iotype;
        node.ioName = n.ioname;
        node.server = RED.nodes.getNode(n.server);

        // set amqp node type initialization parameters
        node.amqpType = "output";
        node.src = null;

        // node specific initialization code
        node.initialize = function () {

            var target;

            // node.ioType is a string with the following meaning:
            // "0": direct exchange
            // "1": fanout exchange
            // "2": headers exchange
            // "3": topic exchange
            // "4": queue
            if(node.ioType === "4") {
                target = node.server.connection.declareQueue(node.ioName);
            } else {
                target = node.server.connection.declareExchange(node.ioName, exchangeTypes[node.ioType]);
            }

            node.on("input", function (msg) {
                var message;
                if (msg.payload) {
                    message = new amqp.Message(msg.payload, msg.options);
                } else {
                    message = new amqp.Message(msg);
                }
                message.sendTo(target, node.topic || msg.topic);
            });
        };

        node.close = function() {

        };

        initialize(node);
    }


//
//-- AMQP SERVER --------------------------------------------------------------
//
function AmqpServer(n) {
    var node = this;
    RED.nodes.createNode(node, n);

    // Store local copies of the node configuration (as defined in the .html)
    node.host = n.host || "localhost";
    node.port = n.port || "5672";
    node.vhost = n.vhost;
    node.keepAlive = n.keepalive;
    node.useTls = n.usetls;
    node.useTopology = n.usetopology;
    node.topology = n.topology;
    node.ca = n.ca || null;

    node.clientCount = 0;
    node.connectionPromise = null;
    node.connection = null;

    node.claimConnection = function() {
        if (node.clientCount === 0) {
        // Create the connection url for the AMQP server
        var urlType = node.useTls ? "amqps://" : "amqp://";
        var credentials = "";
        if (node.credentials.user) {
            credentials = node.credentials.user + ":" + node.credentials.password + "@";
        }
        var urlLocation = node.host + ":" + node.port;
        if (node.vhost) {
            urlLocation += "/" + node.vhost;
        }
        if (node.keepAlive) {
            urlLocation += "?heartbeat=" + node.keepAlive;
        }

        var opt = {
            ca: []
        };

        if (node.ca) {
            console.log(node.ca);
            console.log(urlType + credentials + urlLocation);
            opt.ca.push(new Buffer(node.ca, "base64"));
        }

        node.connection = new amqp.Connection(urlType + credentials + urlLocation, opt);
        node.connectionPromise = node.connection.initialized.then(function () {
            node.log("Connected to AMQP server " + urlType + urlLocation);
        }).catch(function (e) {
            node.error("AMQP-SERVER error: " + e.message);
        });

        // Create topology
        if (node.useTopology) {
            try {
                var topology = JSON.parse(node.topology);
            } catch (e) {
                node.error("AMQP-SERVER error creating topology: " + e.message);
            }
            node.connectionPromise = node.connection.declareTopology(topology).catch(function (e) {
                node.error("AMQP-SERVER error creating topology: " + e.message);
            });
        }
    }
    node.clientCount++;


    return node.connectionPromise;
};

node.freeConnection = function() {
    node.clientCount--;

    if (node.clientCount === 0) {
        node.connection.close().then(function () {
            node.connection = null;
            node.connectionPromise = null;
            node.log("AMQP server connection " + node.host + " closed");
        }).catch(function (e) {
            node.error("AMQP-SERVER error closing connection: " + e.message);
        });
    }
};
}

  // Register the node by name. This must be called before overriding any of the
  // Node functions.
  RED.nodes.registerType("amqp in", AmqpIn);
  RED.nodes.registerType("amqp out", AmqpOut);
  RED.nodes.registerType("amqp-server", AmqpServer, {
      credentials: {
          user: {type: "text"},
          password: {type: "password"}
      }
  });
};

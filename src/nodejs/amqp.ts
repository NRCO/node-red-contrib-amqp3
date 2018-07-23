import * as amqp from "amqp-ts";

module.exports = function(RED) {
    "use strict";

    const exchangeTypes = [
        "direct",
        "fanout",
        "headers",
        "topic"
    ];

    const defaultQueueOptions = {
        durable: true
    };

    const defaultExchangeConfig = defaultQueueOptions;

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

            node.on("close", function(removed, done) {
                node.close(removed)
                .catch(function (err) {
                    node.status({fill: "red", shape: "dot", text: "disconnect error"});
                    node.error("AMQP " + node.amqpType + " node disconnect error: " + err.message);
                    return node.server.freeConnection();
                })
                .then(function () {
                    return node.server.freeConnection();
                })
                .then(() => {
                    node.status({fill: "red", shape: "ring", text: "disconnected"});
                    done();
                })
                .catch(function (err) {
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

        node.sanitize = function(name) {
            return name.replace(/[^a-z0-9\-\.]+/gi, ".");
        };

        node.src = null;
        node.amqpType = "input";

        node.itype = n.itype;
        node.topic = n.topic;
        node.source = n.source;
        node.queue = node.sanitize(n.queue);
        node.exchange = node.sanitize(n.exchange);
        node.server = RED.nodes.getNode(n.server);

        // node specific initialization code
        node.initialize = function () {
            // node.itype is a string with the following meaning:
            // "0": direct exchange
            // "1": fanout exchange
            // "2": headers exchange
            // "3": topic exchange
            // "4": queue
            queue = node.server.connection.declareQueue(
                node.queue,
                defaultQueueOptions
            );

            if(node.itype !== "4") {
                exchange = node.server.connection.declareExchange(
                    node.exchange,
                    exchangeTypes[node.itype],
                    defaultExchangeConfig
                );
                queue.bind(
                    exchange,
                    node.topic
                );
            }

            queue.activateConsumer(
                function(msg) {
                    node.send({
                        topic: msg.fields.routingKey || false,
                        payload: msg.getContent(),
                        amqpMessage: msg
                    });
                },
                {
                    noAck: true
                }
            );
            }
        };

        node.close = function(removed) {
            return new Promise((resolve, reject) => {
                queue.stopConsumer()
                .then(() => {
                    return removed ? queue.close() : Promise.resolve();
                })
                .then(resolve)
                .catch(reject);
            });
        };

        initialize(node);
    }

    function AmqpOut(n) {

        var target,
            node = this;

        RED.nodes.createNode(node, n);

        node.source = n.source;
        node.topic = n.topic;
        node.otype = n.otype;
        node.queue = n.queue;
        node.exchange = n.exchange;
        node.server = RED.nodes.getNode(n.server);

        // set amqp node type initialization parameters
        node.amqpType = "output";
        node.src = null;

        // node specific initialization code
        node.initialize = function () {

            // node.otype is a string with the following meaning:
            // "0": direct exchange
            // "1": fanout exchange
            // "2": headers exchange
            // "3": topic exchange
            // "4": queue
            if(node.otype === "4") {
                target = node.server.connection.declareQueue(
                    node.queue,
                    defaultQueueOptions
                );
            } else {
                target = node.server.connection.declareExchange(
                    node.exchange,
                    exchangeTypes[node.otype],
                    defaultExchangeConfig
                );
            }

            node.on("input", function (msg) {

                var message;

                if (msg.payload) {
                    message = new amqp.Message(msg.payload, msg.options);
                } else {
                    message = new amqp.Message(msg);
                }

                if(node.otype === "4") {
                    message.sendTo(target);
                } else {
                    message.sendTo(target, msg.topic || node.topic);
                }
            });
        };

        node.close = function() {};

        initialize(node);
    }

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

        node.buildUrl = function() {

            var creds = node.credentials,
                protocol = node.useTls ? "amqps://" : "amqp://",
                credentials = creds.user ? `${creds.user}:${creds.password}@` : "",
                vhost = node.vhost ? `/${node.vhost}` : "",
                params = node.keepAlive ? `heartbeat=${node.keepAlive}` : "";

            return `${protocol}${credentials}${node.host}:${node.port}${vhost}${params}`;
        };

        node.claimConnection = function() {
            return new Promise((resolve, reject) => {
                if (node.clientCount === 0) {

                    var opt = {
                        ca: []
                    };

                    if(node.ca) {
                        opt.ca.push(new Buffer(node.ca, "base64"));
                    }

                    node.connection = new amqp.Connection(node.buildUrl(), opt);

                    node.connection.initialized
                    .then(() => {
                        node.log("Connected to AMQP server");
                        if(!node.useTopology) {
                            return Promise.resolve();
                        } else {
                            try {
                                var topology = JSON.parse(node.topology);
                            } catch (e) {
                                node.error("AMQP-SERVER error creating topology: " + e.message);
                                reject(e);
                            }
                            return node.connection.declareTopology(topology);
                        }
                    })
                    .then(() => {
                        resolve(node.connection);
                    })
                    .catch(function (e) {
                        node.error("AMQP-SERVER error: " + e.message);
                    });
                } else {
                    resolve(node.connection);
                }
                node.clientCount++;
            });
        }

        node.freeConnection = function() {
            return new Promise((resolve, reject) => {
                node.clientCount--;
                if(node.clientCount === 0) {
                    node.connection.close().then(function () {
                        node.connection = null;
                        node.connectionPromise = null;
                        node.log("AMQP server connection " + node.host + " closed");
                        resolve();
                    }).catch(function (e) {
                        node.error("AMQP-SERVER error closing connection: " + e.message);
                        reject(e);
                    });
                }
            });

        };
    }

    // Register the node by name. This must be called
    // before overriding any of the node functions.
    RED.nodes.registerType("amqp3 in", AmqpIn);
    RED.nodes.registerType("amqp3 out", AmqpOut);
    RED.nodes.registerType(
        "amqp3-server",
        AmqpServer,
        {
            credentials: {
                user: {
                    type: "text"
                },
                password: {
                    type: "password"
                }
            }
        }
    );
};

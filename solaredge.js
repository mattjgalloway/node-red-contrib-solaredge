var https = require("https");
var urllib = require("url");

module.exports = function (RED) {

    var API_BASE = "https://monitoringapi.solaredge.com/v2";

    function SolarEdgeSite(n) {
        RED.nodes.createNode(this, n);

        this.siteid = n.siteid;
        this.apikey = n.apikey;
    }

    RED.nodes.registerType(
        "solaredge-site",
        SolarEdgeSite
    );

    function SolarEdgeNode(n) {

        RED.nodes.createNode(this, n);

        var node = this;

        node.site = RED.nodes.getNode(n.site);
        node.interval = n.interval;
        node.command = n.command;
        node.timer = null;

        function generateURL(command) {

            return (
                API_BASE +
                "/sites/" +
                node.site.siteid +
                "/" +
                command
            );
        }

        function fetchData() {

            node.timer = setTimeout(
                fetchData,
                node.interval * 1000
            );

            var url = generateURL(
                node.command
            );

            var opts = urllib.parse(url);

            opts.method = "GET";

            opts.headers = {
                "X-API-Key": node.site.apikey,
                "Accept": "application/json"
            };

            var request = https.request(
                opts,
                function (res) {

                    res.setEncoding("utf8");

                    var msg = {
                        statusCode: res.statusCode,
                        payload: ""
                    };

                    res.on(
                        "data",
                        function (chunk) {
                            msg.payload += chunk;
                        }
                    );

                    res.on(
                        "end",
                        function () {

                            try {
                                msg.payload =
                                    JSON.parse(
                                        msg.payload
                                    );
                            }
                            catch (e) {
                                node.warn(
                                    "Invalid JSON returned"
                                );
                            }

                            node.send(msg);

                            node.status({
                                fill: "green",
                                shape: "dot",
                                text:
                                    "HTTP " +
                                    res.statusCode
                            });
                        }
                    );
                }
            );

            request.on(
                "error",
                function (err) {

                    node.error(err);

                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: err.message
                    });
                }
            );

            request.end();
        }

        node.on(
            "close",
            function () {

                if (node.timer) {
                    clearTimeout(
                        node.timer
                    );
                }
            }
        );

        fetchData();
    }

    RED.nodes.registerType(
        "solaredge",
        SolarEdgeNode
    );
};

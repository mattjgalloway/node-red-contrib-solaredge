var https = require('https'),
    urllib = require("url"),
    EventEmitter = require('events').EventEmitter;

module.exports = function(RED) {

    var API_BASE = "https://monitoringapi.solaredge.com";

    function SolarEdgeSite(n) {
        RED.nodes.createNode(this, n);

        this.siteid = n.siteid;
        this.apikey = n.apikey;
    }
    RED.nodes.registerType("solaredge-site", SolarEdgeSite);

    function SolarEdgeNode(n) {
        RED.nodes.createNode(this, n);

        var node = this;
        node.site = RED.nodes.getNode(n.site);
        node.interval = n.interval;
        node.command = n.command;
        node.timer = {};
        
        function generateURL(command, options) {
            var query = "";
            for (var key in options) {
                query += encodeURIComponent(key) + "=" + encodeURIComponent(options[key]);
            }
            return API_BASE + "/site/" + node.site.siteid + "/" + command + ".json" + "?" + query;
        }
        
        function fetchData() {
            node.timer = setTimeout(fetchData, node.interval * 1000);

            var options = { api_key: node.site.apikey };
            var url = generateURL(node.command, options);

            var opts = urllib.parse(url);
            opts.method = "GET";

            var request = https.request(opts, function(res) {
                res.setEncoding('utf8');

                var msg = {};
                msg.statusCode = res.statusCode;
                msg.payload = "";

                res.on("data", function(chunk) {
                    msg.payload += chunk;
                    node.log(chunk);
                });

                res.on("end",function() {
                    try { msg.payload = JSON.parse(msg.payload); }
                    catch(e) { node.warn(RED._("httpin.errors.json-error")); }
                    node.send(msg);
                    node.status({});
                });
            });

            request.on("error", function(err) {
                node.error(err);
                // TODO
            });

            request.end();
        }

        node.on("close", function(){
            if (node.timer) {
                clearTimeout(node.timer);
            }
        });

        fetchData();
    }
    RED.nodes.registerType("solaredge", SolarEdgeNode);

};

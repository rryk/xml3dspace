if (typeof(VisComp) === "undefined") VisComp = {};

Kata.require([
    'katajs/oh/Script.js'
], function() {

    var SUPER = Kata.Script.prototype;
    VisComp.TileScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});

        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));

        this.logContainerId = args.logContainerId;
        this.mesh = args.visual.mesh;
    };
    Kata.extend(VisComp.TileScript, SUPER);

    // callback which is triggered when object is connected to the space
    VisComp.TileScript.prototype.connected = function(presence, space, reason) {
        this.log("Tile " + presence.id() + " connected");
    }

    VisComp.TileScript.prototype.log = function(message) {
        document.getElementById(this.logContainerId).appendChild(
            document.createTextNode(
                new Date().toLocaleTimeString() + " " + message
            )
        );
        document.getElementById(this.logContainerId).appendChild(
            document.createElement("br")
        );
    }

}, kata_base_offset + "scripts/TileScript.js");


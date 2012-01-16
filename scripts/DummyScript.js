if (typeof(VisComp) === "undefined") VisComp = {};

Kata.require([
    'katajs/oh/Script.js'
], function() {

    var SUPER = Kata.Script.prototype;
    VisComp.DummyScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});
        
        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
        
        this.logContainerId = args.logContainerId;
        this.mesh = args.visual.mesh;
    };
    Kata.extend(VisComp.DummyScript, SUPER);
    
    // callback which is triggered when object is connected to the space
    VisComp.DummyScript.prototype.connected = function(presence, space, reason) {
        this.log("Object " + presence.id() + " connected");
    }
    
    VisComp.DummyScript.prototype.log = function(message) {
        document.getElementById(this.logContainerId).appendChild(
            document.createTextNode(
                new Date().toLocaleTimeString() + " " + message
            )
        );
        document.getElementById(this.logContainerId).appendChild(
            document.createElement("br")
        );
    }
    
}, kata_base_offset + "scripts/DummyScript.js");


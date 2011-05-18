var Lemmings = {};

Kata.require([
    'katajs/oh/GraphicsScript.js',
], function() {

    var SUPER = Kata.GraphicsScript.prototype;
    Lemmings.WorldScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});
        
        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
    };
    Kata.extend(Lemmings.WorldScript, SUPER);    
    
    // callback which is triggered when object is connected to the space
    Lemmings.WorldScript.prototype.connected = function(presence) {
        // set click handler for disconnect button and enable it
        $("#disconnectButton").click(Kata.bind(this.disconnect, this, presence));
        $("#disconnectButton").removeAttr("disabled");
        
        // set click handler for create-lemming button and enable it
        $("#createLemmingButton").click(Kata.bind(this.createLemming, this));
        $("#createLemmingButton").removeAttr("disabled");
    }
    
    // disconnect from the server
    Lemmings.WorldScript.prototype.disconnect = function(presence) {
        // disable create-leming and disconnect buttons
        $("#disconnectButton").attr("disabled", true);
        $("#createLemmingButton").attr("disabled", true);
        
        // disconnect from the space server
        // FIXME: space server doesn't report disconnect
        SUPER._disconnect.call(this, presence);
    }
    
    Lemmings.WorldScript.prototype.createLemming = function() {
        // TODO: create lemmings
        alert("Lemmings are sleeping. Don't distrub them!");
    }
    
}, kata_base_offset + "scripts/WorldScript.js");


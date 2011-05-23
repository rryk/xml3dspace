if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/oh/Script.js',
    kata_base_offset + 'scripts/behaviors/radar/Radar.js'
], function() {

    var SUPER = Kata.Script.prototype;
    Lemmings.BoxScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});
        
        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
        
        // add trackable radar for this lemming
        this.radar = new Lemmings.Behavior.Radar(this, false);
    };
    Kata.extend(Lemmings.BoxScript, SUPER);
    
    // callback which is triggered when object is connected to the space
    Lemmings.BoxScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null)
        {
            Kata.error('Failed to connect lemming object to ' + space + '. Reason: ' + reason);
            return;
        }
        
        // save box's world presence
        this.presence = presence;
    }
    
    // return object's type
    Lemmings.BoxScript.prototype.getType = function() {
        return "box";
    }
    
}, kata_base_offset + "scripts/BoxScript.js");


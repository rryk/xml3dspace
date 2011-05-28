if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/oh/GraphicsScript.js',
], function() {

    var SUPER = Kata.GraphicsScript.prototype;
    Lemmings.ViewerScript = function(channel, args) {
        // initialize viewer in the origin
        this.initialLocation = Kata.LocationIdentityNow();
        
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});
        
        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
    };
    Kata.extend(Lemmings.ViewerScript, SUPER);
    
    // callback which is triggered when object is connected to the space
    Lemmings.ViewerScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null) {
            Kata.error('Failed to connect viewer to ' + space + '. Reason: ' + reason);
            return;
        }
        
        // save box's world presence
        this.presence = presence;
        
        // enable graphics
        this.enableGraphicsViewport(presence, 0);
        
        // send a location update to the space server
        this.presence.setLocation(this.initialLocation);
        
        // initialize proximity handler
        presence.setQueryHandler(Kata.bind(this.proxEvent, this));
        presence.setQuery(0);
    }
    
    // proximity callback
    Lemmings.ViewerScript.prototype.proxEvent = function(remote, added) {
        if (added)
            this.presence.subscribe(remote.id());
    };
    
}, kata_base_offset + "scripts/ViewerScript.js");


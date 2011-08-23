if (typeof(FIContent) === "undefined") FIContent = {};

Kata.require([
    'katajs/oh/GraphicsScript.js',
], function() {

    var SUPER = Kata.GraphicsScript.prototype;
    FIContent.AvatarScript = function(channel, args) {
        // initialize viewer in the origin
        this.initialLocation = Kata.LocationIdentityNow();

        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});

        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
    };
    Kata.extend(FIContent.AvatarScript, SUPER);

    // callback which is triggered when object is connected to the space
    FIContent.AvatarScript.prototype.connected = function(presence, space, reason) {
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
    FIContent.AvatarScript.prototype.proxEvent = function(remote, added) {
        if (added)
            this.presence.subscribe(remote.id());
    };

}, kata_base_offset + "scripts/ViewerScript.js");


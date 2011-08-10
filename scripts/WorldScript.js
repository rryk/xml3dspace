if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/oh/Script.js',
    kata_base_offset + 'scripts/Tools.js',
    kata_base_offset + 'scripts/behaviors/radar/Radar.js',
    kata_base_offset + 'scripts/behaviors/radar/RadarDisplay.js'
], function() {
    
    var SUPER = Kata.Script.prototype;
    Lemmings.WorldScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});
        
        // save the space that we are connected to
        this.space = args.space;
        
        // save world's configuration
        this.worldBounds = args.worldBounds; // [minX, maxX, minY, maxY, minZ, maxZ]
        this.lemmingMesh = args.lemmingMesh;
        this.boxMesh = args.boxMesh;
        this.lemmingSpeed = args.lemmingSpeed;
        this.lemmingCornerDetectionThreshold = args.lemmingCornerDetectionThreshold;
        
        // position static world in the origin
        args.loc = Kata.LocationIdentityNow();
        
        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
        
        // add display behavior to the world object
        this.display = new Lemmings.Behavior.RadarDisplay(this);
        
        // add radar behavior to the world object
        this.radar = new Lemmings.Behavior.Radar(this, false, 
            this.display.getStartTrackingCallback(),
            this.display.getStopTrackingCallback());
    };
    Kata.extend(Lemmings.WorldScript, SUPER);    
    
    // callback which is triggered when object is connected to the space
    Lemmings.WorldScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null)
        {
            Kata.error('Failed to connect world object to ' + space + '. Reason: ' + reason);
            return;
        }
        
        // set click handler for disconnect button and enable it
        $("#disconnectButton").click(Kata.bind(this.disconnect, this, presence));
        $("#disconnectButton").removeAttr("disabled");
        
        // set click handler for create-lemming button and enable it
        $("#createLemmingButton").click(Kata.bind(this.createLemming, this));
        $("#createLemmingButton").removeAttr("disabled");
        
        // set click handler for creaet-box button and enable it
        $("#createBoxButton").click(Kata.bind(this.createBox, this));
        $("#createBoxButton").removeAttr("disabled");
    }
    
    // disconnect from the server
    Lemmings.WorldScript.prototype.disconnect = function(presence) {
        // disable create-leming and disconnect buttons
        $("#disconnectButton").attr("disabled", "disabled");
        $("#createLemmingButton").attr("disabled", "disabled");
        $("#createBoxButton").attr("disabled", "disabled");
        $("#connectButton").removeAttr("disabled");
        
        // disconnect from the space server
        // FIXME: space server doesn't report disconnect
        this._disconnect(presence);
    }
    
    // create a lemming
    Lemmings.WorldScript.prototype.createLemming = function() {
        for (var i = 0; i < $("#numberToCreate").val(); i++)            
        {
            this.createObject(
                kata_base_offset + "scripts/LemmingScript.js", 
                "Lemmings.LemmingScript",
                {
                    space: this.space, // space to connect to
                    visual: {mesh: this.lemmingMesh}, // lemming's mesh
                    loc: Lemmings.randomizePositionInXZ(this.worldBounds), // initial location
                    worldBounds: this.worldBounds, // position bounds
                    speed: this.lemmingSpeed, // lemming's speed
                });
        }
    }
    
    // create a box
    Lemmings.WorldScript.prototype.createBox = function() {
        for (var i = 0; i < $("#numberToCreate").val(); i++)
            this.createObject(
                kata_base_offset + "scripts/BoxScript.js", 
                "Lemmings.BoxScript",
                {
                    space: this.space, // space to connect to
                    visual: {mesh: this.boxMesh}, // box's mesh
                    loc: Lemmings.randomizePositionInXZ(this.worldBounds), // initial location
                });
    }
    
}, kata_base_offset + "scripts/WorldScript.js");


if (typeof(VisComp) === "undefined") VisComp = {};

Kata.require([
    'katajs/oh/Script.js',
    kata_base_offset + "scripts/Tools.js",
], function() {

    var SUPER = Kata.Script.prototype;
    VisComp.TileManagerScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, Kata.bind(this.updateAnimation, this));

        // connect to the space server
        args.loc = {scale: [0, 0, 0, 1], pos: [0, 0, 0]},
        this.connect(args, null, Kata.bind(this.connected, this));
        
        // save arguments
        this.logContainer = args.logContainer;
        this.mapServer = args.mapServer;
        this.area = args.area;
        this.zoom = args.zoom;
        this.aggregateLayers = args.aggregateLayers;
        this.space = args.space;
    };
    Kata.extend(VisComp.TileManagerScript, SUPER);
    
    VisComp.TileManagerScript.prototype.log = function(message) {
        document.getElementById(this.logContainer).appendChild(
            document.createTextNode(
                new Date().toLocaleTimeString() + " " + message + "\n"
            )
        );
    }

    // callback which is triggered when object is connected to the space
    VisComp.TileManagerScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null) {
            Kata.error('Failed to connect avatar to ' + space + '. Reason: ' + reason);
            return;
        }
        
        this.log("Connected to space server");

        // save presence
        this.presence = presence;
        
        // get the list of layers
        var thus = this;
        $.get(this.mapServer, {action: "getlayers"}, function(layers) {
            thus.log("Received info about " + layers.length +  " layers");
            thus.createLayerObjects(layers);
        }, "json");
    }
    
    VisComp.TileManagerScript.prototype.createDummyObject = function(pos, orient, scale, mesh) {
        var loc = Kata.LocationIdentityNow();
        loc.pos = pos;
        loc.orient = orient;
        loc.scale = scale;
        
        this.createObject(
                kata_base_offset + "scripts/DummyScript.js", 
                "VisComp.DummyScript",
                {
                    space: this.space,
                    visual: {mesh: mesh},
                    loc: loc,
                    logContainer: this.logContainer
                });

        this.log("Registered object: " + mesh);
    }
    
    VisComp.TileManagerScript.prototype.createLayerObjects = function(layers) {
        for (var x = this.area.minx; x <= this.area.maxx; x++)
        {
            for (var y = this.area.miny; y <= this.area.maxy; y++)
            {
                // FIXME: this values should be computed for each layer
                var pos = [0, 0, 0];
                var orient = [0, 0, 0, 1];
                var scale = [0, 0, 0, 1];
                
                var mesh = this.mapServer + "?action=getxml3d&&x=" + x + "&&y=" 
                    + y + "&&z=" + this.zoom;
                
                for (index in layers)
                {
                    // if we aggregate layers, then just end each layer to the
                    // request URI, otherwise create object for each layer
                    if (this.aggregateLayers)
                        mesh += "&&layers[]=" + layers[index];
                    else
                        this.createDummyObject(pos, orient, scale, 
                                          mesh + "&&layers[]=" + layers[index]);
                }
                
                // create aggregated object
                if (this.aggregateLayers)
                    this.createDummyObject(pos, orient, scale, mesh);
            }
        }
    }

}, kata_base_offset + "scripts/TileManagerScript.js");


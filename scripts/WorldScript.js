if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/oh/Script.js',
    kata_base_offset + 'scripts/Tools.js',
    kata_base_offset + 'scripts/behaviors/radar/Radar.js'
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
        
        // add tracking radar behavior to the world object
        this.radar = new Lemmings.Behavior.Radar(this, true);
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
    
    // generates unique lemming names (numbers)
    Lemmings.WorldScript.prototype.randomLemmingName = function() {
        var lemmingNames = ["Aturo", "Uvese", "Onyu", "Ingll", "Yundu", "Uanga", "Ayeri",
            "Ardck", "Qued", "Denlt", "Teylt", "Yah", "Tooy", "Morlt", "Iwara", "Turm", 
            "Rothnn", "Schiz", "Uimi", "Atd", "Oldst", "Uatha", "Lleid", "Ainau", "Ukimi", 
            "Kooss", "Emnn", "Nays", "Rais", "Llist", "Serz", "Zhich", "Ert", "Warn",
            "Orilo", "Luis", "Dreall", "Lod", "Arg", "Uyeru", "Estf", "Staun", "Wheart", 
            "Tonw", "Nalk", "Echay", "Ichay", "Rhoy", "Ithery", "Engs", "Rend", "Skelh", 
            "Toil", "Sliant", "Etc", "Rop", "Naeph", "Tiam", "Lleel", "Loc", "Echn", 
            "Lok", "Streyth", "Udary", "Zhyl", "Iny", "Niant", "Euntu", "Emz", "Boin", 
            "Shed", "Ans", "Feyl", "Verv", "Kinh", "Doer", "Hatl", "Smaut", "Sliec", 
            "Zhel", "Ogara", "Schoid", "Dain", "Oesso", "Aqua", "Yeyck", "Saych", "Yendo", 
            "Keyn", "Risg", "Soin", "Angd", "Skelm", "Ums", "Einae", "Honth", "Echw", 
            "Ormb", "Thaul", "Quast", "Ealda", "Undck", "Iasha", "Versh", "Esulo", 
            "Irothe", "Staun", "Arf", "Ceas", "Zym", "Itt", "Buil", "Wors", "Sayr", 
            "Eisa", "Pir", "Veun", "Atn", "Wark"];
            
        return lemmingNames[Math.floor(Math.random() * lemmingNames.length)];
    }
    
    // create a lemming
    Lemmings.WorldScript.prototype.createLemming = function() {
        this.createObject(
            kata_base_offset + "scripts/LemmingScript.js", 
            "Lemmings.LemmingScript",
            {
                name: this.randomLemmingName(), // lemming's name
                space: this.space, // space to connect to
                mesh: this.lemmingMesh, // lemming's mesh
                loc: Lemmings.randomizePositionInXZ(this.worldBounds), // initial location
                posBounds: this.worldBounds, // position bounds
                speed: this.lemmingSpeed, // lemming's speed
                cornerDetectionThreshold: this.lemmingCornerDetectionThreshold, // corner detection threshold
            });
    }
    
    // create a box
    Lemmings.WorldScript.prototype.createBox = function() {
        this.createObject(
            kata_base_offset + "scripts/BoxScript.js", 
            "Lemmings.BoxScript",
            {
                space: this.space, // space to connect to
                mesh: this.boxMesh, // box's mesh
                loc: Lemmings.randomizePositionInXZ(this.worldBounds), // initial location
                posBounds: this.worldBounds, // position bounds
            });
    }
    
}, kata_base_offset + "scripts/WorldScript.js");


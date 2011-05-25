if (typeof(Lemmings) === "undefined") Lemmings = {};
if (typeof(Lemmings.Behavior) === "undefined") Lemmings.Behavior = {};

Kata.require([
    'externals/protojs/protobuf.js',
    'externals/protojs/pbj.js',
    kata_base_offset + 'scripts/behaviors/radar/Radar.pbj.js'
], function() {

    /** Constructs new radar behavior.
     *   @param parent parent object script
     */
    Lemmings.Behavior.Radar = function(parent, isTracking) {
        // save parent object script and register with it
        this.parent = parent;
        this.parent.addBehavior(this);
        
        // save the radar type
        this.isTracking = isTracking;
        
        // init tracked objects array
        if (this.isTracking) {
            this.trackedObjs = {};
            this.trackedObjsCount = 0;
            
            // initialize connected flag
            this.connectedToSpace = false;
        }
        
        // init ODP ports array
        this.odpPorts = {};
    }
    
    // Port used for communication with radar
    Lemmings.Behavior.Radar.prototype.ProtocolPort = 15;
    
    /** Initilaze ODP port for presence. */
    Lemmings.Behavior.Radar.prototype.initODPPort = function(presence) {
        var odpPort = presence.bindODPPort(this.ProtocolPort);
        odpPort.receive(Kata.bind(this.handleMessage, this, presence));
        this.odpPorts[presence] = odpPort;
    }
    
    /** Return existing or create ODP port for presence. */
    Lemmings.Behavior.Radar.prototype.getODPPort = function(presence) {
        if (!this.odpPorts[presence])
            this.initODPPort(presence);
        
        return this.odpPorts[presence];
    }
    
    /** 
     * Callback for new or invalidated remote presences.
     * 
     * @param presence Our presence for the space, with which remote presence is associated with.
     * @param remote Remote presence.
     * @param added Flag that denotes whether remote object was created (true) or removed (false).
     */
    Lemmings.Behavior.Radar.prototype.remotePresence = function(presence, remote, added) {
        if (this.isTracking)
        {
            if (added) {
                // create an intro message
                var introMsg = new Radar.Protocol.Intro();
                var containerMsg = new Radar.Protocol.Container();
                containerMsg.intro = introMsg;
                
                // send the intro message
                this.getODPPort(presence).send(remote.endpoint(this.ProtocolPort), this.serializeMessage(containerMsg));
            } else {
                if (this.trackedObjs[remote.presenceID()])
                    this.stopTrackingRemote(remote.presenceID());
            }
        }
    }
    
    /** Serialize message into byte-stream. */
    Lemmings.Behavior.Radar.prototype.serializeMessage = function(msg) {
        var serialized = new PROTO.ByteArrayStream();
        msg.SerializeToStream(serialized);
        return serialized.getArray();
    };
    
    /** Callback for new presence in the space. May be called several times if
     *  object connects to multiple space servers.
     */
    Lemmings.Behavior.Radar.prototype.newPresence = function(presence) {
        if (this.isTracking) {
            if (this.connectedToSpace)
                Kata.error("Radar behavior does not support multiple space servers.");
            
            // create radar canvas (assume one space server)
            $("#radar").append("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
            
            // set connected flag
            this.connectedToSpace = true;
        }
        
        // create ODP port and start listening to messages
        this.initODPPort(presence);
    }
    
    /** Callback for invalidated presence in the space. */
    Lemmings.Behavior.Radar.prototype.presenceInvalidated = function(presence) {
        if (this.isTracking) {
            if (!this.connectedToSpace)
                Kata.error("Not connected to any space server.");
        
            // stop tracking all objects (assume one space server)
            for (var i in this.trackedObjs)
                this.stopTrackingRemote(presence, i);
            
            // destroy radar canvas
            $("#radar").empty();
            
            // clear connected flag
            this.connectedToSpace = false;
        }
        
        // close and remove port
        this.getODPPort(presence).close();
        delete this.odpPorts[presence];
    }
    
    /** Starts tracking remote presence (currently only lemmings). This is only called for tracking radar.
     *   @param presence our presence (of world object)
     *   @param remotePresenceID id of remote presence to be tracked
     */
    Lemmings.Behavior.Radar.prototype.trackRemote = function(remotePresenceID, msg) {
        // add remote presence for tracking
        var remote = this.parent.getRemotePresence(remotePresenceID);
        this.trackedObjs[remotePresenceID] = remote;
        this.trackedObjsCount++;
        
        // start tracking if first remote presence was added
        if (this.trackedObjsCount == 1)
            this.startTracking();
            
        // create SVG object
        if (msg.type == "lemming") {
            var svgObj = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            svgObj.setAttribute("r", "5");
            svgObj.setAttribute("class", "lemming");
            svgObj.setPosition = function(x, y) {
                svgObj.setAttribute("cx", x);
                svgObj.setAttribute("cy", y);
            }
        } else if (msg.type == "box") {
            var svgObj = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            svgObj.setAttribute("width", "25");
            svgObj.setAttribute("height", "25");
            svgObj.setAttribute("class", "box");
            svgObj.setPosition = function(x, y) {
                svgObj.setAttribute("x", x - 15);
                svgObj.setAttribute("y", y - 15);
            }
        }
        
        // hide object beyond the canvas until we will get initial position
        svgObj.setPosition(-1000, -1000);
        
        // append svg object to the dom
        $("#radar > svg").append(svgObj);
        
        // save SVG object in remote record
        remote.svgObj = svgObj;
    }
    
    /** Starts tracking process. This is only called for tracking radar. */
    Lemmings.Behavior.Radar.prototype.startTracking = function() {
        // start regular updates
        this.trackingInterval = window.setInterval(Kata.bind(this.updateRadar, this), 100);
    }
    
    /** Stops tracking process. This is only called for tracking radar. */
    Lemmings.Behavior.Radar.prototype.stopTracking = function() {
        // stop regular updates
        window.clearInterval(this.trackingInterval);
    }
    
    /** Maps 3D world coordinates to 2D canvas (X->X, Z->Y, Y is ignored) */
    Lemmings.Behavior.Radar.prototype.updateSVGPosition = function(objRemote, time) {
        var objPos = objRemote.position(time);
        
        var x = 600 * (objPos[0] - this.parent.worldBounds[0]) / (this.parent.worldBounds[1] - this.parent.worldBounds[0]);
        var y = 600 * (objPos[2] - this.parent.worldBounds[4]) / (this.parent.worldBounds[5] - this.parent.worldBounds[4]);
        
        objRemote.svgObj.setPosition(x, y);
    }
    
    /** Updates radar display */
    Lemmings.Behavior.Radar.prototype.updateRadar = function() {
        // select the moment to compute object positions for
        var now = new Date();
        
        // update all tracked objects
        for (objid in this.trackedObjs)
            this.updateSVGPosition(this.trackedObjs[objid], now);
    }
    
    /** Stops tracking remote presence. This is only called for tracking radar.
     *   @param presence our presence (of world object)
     *   @param remotePresenceID id of remote presence to be tracked
     */
    Lemmings.Behavior.Radar.prototype.stopTrackingRemote = function(remotePresenceID) {
        if (!this.trackedObjs[remotePresenceID])
            Kata.warn("Stop tracking request for non-tracked object.");
        else
        {
            // remove SVG object from the DOM
            $(this.trackedObjs[remotePresenceID].svgObj).remove();
            delete this.trackedObjs[remotePresenceID].svgObj;
            
            // remove remote presence from tracking array
            delete this.trackedObjs[remotePresenceID];
            this.trackedObjsCount--;
        }
        
        // stop tracking if last remote presence is removed
        if (this.trackedObjsCount == 0)
            this.stopTracking();
    }
    
    
    
    /** Handle incoming messages 
     *   @param presence presence that this message arrived to
     *   @param src source ODP endpoint
     *   @param dest destination ODP endpoint
     *   @param payload byte-stream payload
     */
    Lemmings.Behavior.Radar.prototype.handleMessage = function(presence, src, dest, payload) {
        var containerMsg = new Radar.Protocol.Container();
        containerMsg.ParseFromStream(new PROTO.ByteArrayStream(payload));
        
        if (this.isTracking && containerMsg.HasField("track")) { // for tracking radar
            this.trackRemote(src.presenceID(), containerMsg.track);
        } else if (!this.isTracking && containerMsg.HasField("intro")) { // for trackable radar
            // create an track message
            var trackMsg = new Radar.Protocol.Track();
            trackMsg.type = this.parent.getType();
            
            // set name if available
            if (this.parent.getName)
                trackMsg.name = this.parent.getName();
            
            var containerMsg = new Radar.Protocol.Container();
            containerMsg.track = trackMsg;
            
            // send the track message
            this.getODPPort(presence).send(src, this.serializeMessage(containerMsg));
        }
    }

}, kata_base_offset + 'scripts/behaviors/radar/Radar.js');
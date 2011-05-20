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
        
        // init tracked objects array
        this.trackedObjs = {};
        
        // init ODP ports array
        this.odpPorts = {};
        
        // save the isTrackable flag
        this.isTracking = isTracking;
    }
    
    // Port used for communication with radar
    Lemmings.Behavior.Radar.prototype.ProtocolPort = 15;
    
    /** Returns ODP port for radar service on a given presence (per space) */
    Lemmings.Behavior.Radar.prototype.getODPPort = function(presence) {
        if (!this.odpPorts[presence])
        {
            var odpPort = presence.bindODPPort(this.ProtocolPort);
            odpPort.receive(Kata.bind(this.handleMessage, this, presence));
            this.odpPorts[presence] = odpPort;
        }
        
        return this.odpPorts[presence];
    }
    
    /** Reacts to new remote presences (other objects than the one we are registered with)
     *   @param presence our own presence in the same space as remote presence
     *   @param remote remote presence
     *   @param added flag that denotes where object was created (true) or removed (false)
     */
    Lemmings.Behavior.Radar.prototype.remotePresence = function(presence, remote, added) {
        if (added) {
            // create an intro message
            var introMsg = new Radar.Protocol.Intro();
            var containerMsg = new Radar.Protocol.Container();
            containerMsg.intro = introMsg;
            
            // send the intro message
            this.getODPPort(presence).send(remote.endpoint(this.ProtocolPort), this.serializeMessage(containerMsg));
        } else {
            if (this.trackedObjs[remote.presenceID()])
                this.stopTracking(presence, remote.presenceID());
        }
        
        return;
    }
    
    /** Serializes message into byte-stream
     *   @param msg message to be serialized
     *   @return serialized message
     */
    Lemmings.Behavior.Radar.prototype.serializeMessage = function(msg) {
        var serialized = new PROTO.ByteArrayStream();
        msg.SerializeToStream(serialized);
        return serialized.getArray();
    };
    
    /** Reacts to new presence in each new space we connect to.
     *   @param presence new presence
     */
    Lemmings.Behavior.Radar.prototype.newPresence = function(presence) {
        if (this.isTracking) {
            // TODO: if first presence - display radar
        }
        
        // start listening to messages
        this.getODPPort(presence);
        
        return;
    }
    
    /** Reacts to invalidated (disconnected) presence from one of the spaces we are connected to.
     *   @param presence invalidated presence
     */
    Lemmings.Behavior.Radar.prototype.presenceInvalidated = function(presence) {
        if (this.isTracking) {
            // TODO: if last presence - hide radar, stop tracking
            // TODO: remove all tracked object from the same space server
        }
        
        // close and remove port
        this.getODPPort(presence).close();
        delete this.odpPorts[presence];
        
        return;
    }
    
    /** Starts tracking remote presence (currently only lemmings).
     *   @param presence our presence (of world object)
     *   @param remotePresenceID id of remote presence to be tracked
     */
    Lemmings.Behavior.Radar.prototype.track = function(presence, remotePresenceID, msg) {
        // TODO: add remote presence for tracking
        // TODO: start tracking if first remote presence was added
        
        Kata.log("Started tracking " + msg.name);
        
        return;
    }
    
    /** Stops tracking remote presence.
     *   @param presence our presence (of world object)
     *   @param remotePresenceID id of remote presence to be tracked
     */
    Lemmings.Behavior.Radar.prototype.stopTracking = function(presence, remotePresenceID) {
        // TODO: remove remote presence from tracking array
        // TODO: stop tracking if last remote presence is removed
        
        Kata.log("Stopped tracking " + msg.name);
        
        return;
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
        
        console.log("message to radar behavior: ");
        console.log(containerMsg);
        
        if (this.isTracking && containerMsg.HasField("track")) {
            this.track(presence, src.presenceID(), containerMsg.track);
        } else if (!this.isTracking && containerMsg.HasField("intro")) {
            // create an track message
            var trackMsg = new Radar.Protocol.Track();
            trackMsg.name = this.parent.getName();
            
            var containerMsg = new Radar.Protocol.Container();
            containerMsg.track = trackMsg;
            
            // send the track message
            this.getODPPort(presence).send(src, this.serializeMessage(containerMsg));
        }
    }

}, kata_base_offset + 'scripts/behaviors/radar/Radar.js');
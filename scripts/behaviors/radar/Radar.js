if (typeof(Lemmings) === "undefined") Lemmings = {};
if (typeof(Lemmings.Behavior) === "undefined") Lemmings.Behavior = {};

Kata.require([
    ['externals/protojs/protobuf.js', 'externals/protojs/pbj.js'],
    kata_base_offset + 'scripts/behaviors/radar/Radar.pbj.js'
], function() {

    /** 
     * Constructs new radar behavior. Radar is designed to track other objects
     * in the world, that have the same behaviour and marked as trackable. It
     * supports tracking objects from multiple spaces (parent script needs to
     * connect to each such space).
     *
     * @param parent parent object script
     * @isTrackable defines whether this object is trackable
     */
    Lemmings.Behavior.Radar = function(parent, isTrackable, startTrackingCallback, stopTrackingCallback) {
        // save parent object script and register with it
        this.parent = parent;
        this.parent.addBehavior(this);
        
        // save trackable flag
        this.isTrackable = isTrackable;
        
        // save callbacks
        this.startTrackingCallback = startTrackingCallback;
        this.stopTrackingCallback = stopTrackingCallback;
        
        // init arrays
        this.trackedObjs = {};
        this.odpPorts = {};
        this.delayedRP = {};
        this.registeredRP = {};
    }
    
    // Port used for communication with radar
    Lemmings.Behavior.Radar.prototype.ProtocolPort = 15;
    
    /** 
     * Return existing or create new ODP port for the presence. 
     *
     * @param presenceID Presence ID.
     */
    Lemmings.Behavior.Radar.prototype.getODPPort = function(presence) {
        var presenceID = presence.id();
        if (!this.odpPorts[presenceID])
        {
            var odpPort = presence.bindODPPort(this.ProtocolPort);
            odpPort.receive(Kata.bind(this.handleMessage, this, presenceID));
            this.odpPorts[presenceID] = odpPort;
        }
        
        return this.odpPorts[presenceID];
    }
    
    /** 
     * Callback for new or invalidated remote presences. Trackable objects send track message to
     * all other objects in the scene, so that they can track us. We also check every object that
     * have left and remove them from they list of tracked objects if needed.
     * 
     * @param presence Our presence.
     * @param remote Remote presence.
     * @param added Flag that denotes whether remote object was created (true) or removed (false).
     */
    Lemmings.Behavior.Radar.prototype.remotePresence = function(presence, remote, added) {
        //console.log("Radar::remotePresence(presence=" + presence.id() + ", remote=" + remote.id() + ", added=" + (added?"true":"false") + ")");
        
        if (added) {
            if (this.isTrackable)
            {
                // create an intro message
                var trackMsg = new Radar.Protocol.Track();
                if (this.parent.getName)
                    trackMsg.name = this.parent.getName();
                trackMsg.type = this.parent.getType();
                trackMsg.size = this.parent.getSize();
                var containerMsg = new Radar.Protocol.Container();
                containerMsg.track = trackMsg;
                
                // send the intro message
                this.getODPPort(presence).send(remote.endpoint(this.ProtocolPort), Lemmings.serializeMessage(containerMsg));
            }
            
            // register remote presence
            var rpKey = remote.presenceID().toString();
            this.registeredRP[rpKey] = true;
            
            // start tracking delayed objects
            var delayedRP = this.delayedRP[rpKey];
            if (delayedRP && delayedRP.push)
               for (var i = 0; i < delayedRP.length; i++)
                   delayedRP[i]();
        } else {
            // unregister remote presence
            delete this.registeredRP[remote.presenceID()];
        
            if (this.trackedObjs[remote.id()])
                this.stopTracking(presence, remote.presenceID());
        }
    }
    
    /** 
     * Callback for each new presence. We have a separate presence in
     * each space that we connect to.
     */
    Lemmings.Behavior.Radar.prototype.newPresence = function(presence) {
        //console.log("Radar::newPresence(presence=" + presence.id() + ")");
        
        // create ODP port and start listening to messages
        this.getODPPort(presence);
    }
    
    /** 
     * Retuns anassociative array of tracked object for presence, where object ID
     * id used for indexing. If presence is not specified, then retuns list of all
     * tracked objects by presence. In the latter case array is indexed by presence
     * ID, each containing an associative array indexed by object ID.
     */
    Lemmings.Behavior.Radar.prototype.listTrackedObjects = function(presence) {
        if (presence)
            if (this.trackedObjs[presence])
                return this.trackedObjs[presence];
            else
                return {};
        else
            return this.trackedObjs;
    }
    
    /** Callback for invalidated presence in the space. */
    Lemmings.Behavior.Radar.prototype.presenceInvalidated = function(presence) {
        // stop tracking all objects from the same presence
        var presenceID = presence.id();
        if (this.trackedObjs[presenceID])
            for (var i in this.trackedObjs[presenceID])
                this.stopTracking(presenceID, i);
        
        // close and remove port
        this.getODPPort(presence).close();
        delete this.odpPorts[presenceID];
    }
    
    /** 
     * Starts tracking remote object. This is only called for tracking radar.
     *
     * @param presence Our presence.
     * @param remoteID Remote presence ID.
     * @param trackMsg Track message that was received.
     */
    Lemmings.Behavior.Radar.prototype.startTracking = function(presenceID, remotePresenceID, trackMsg) {
        //console.log("Radar::startTracking(presenceID=" + presenceID + ", remotePresenceID=" + remotePresenceID.object() +", trackMsg)");
        
        // add remote presence for tracking
        var remoteID = remotePresenceID.object();
        if (!this.trackedObjs[presenceID]) 
            this.trackedObjs[presenceID] = {};
        this.trackedObjs[presenceID][remoteID] = {
            name: trackMsg.name,
            type: trackMsg.type,
            size: trackMsg.size
        };
        
        // notify parent script
        if (this.startTrackingCallback)
        {
            var rpKey = remotePresenceID.toString();
            if (this.registeredRP[rpKey]) {
                this.startTrackingCallback(presenceID, remotePresenceID, this.trackedObjs[presenceID][remoteID]);
            } else {
                this.delayedRP[rpKey] = this.delayedRP[rpKey] ? this.delayedRP[remotePresenceID] : [];
                this.delayedRP[rpKey].push(
                    Kata.bind(this.startTrackingCallback, this, presenceID, remotePresenceID, this.trackedObjs[presenceID][remoteID])
                );
            }
        }
    }
    
    ////** Starts tracking process. This is only called for tracking radar. */
    //Lemmings.Behavior.Radar.prototype.startTracking = function() {
    //    // start regular updates
    //    this.trackingInterval = window.setInterval(Kata.bind(this.updateRadar, this), 100);
    //}
    //
    ////** Stops tracking process. This is only called for tracking radar. */
    //Lemmings.Behavior.Radar.prototype.stopTracking = function() {
    //    // stop regular updates
    //    window.clearInterval(this.trackingInterval);
    //}
    //
    ////** Maps 3D world coordinates to 2D canvas (X->X, Z->Y, Y is ignored) */
    //Lemmings.Behavior.Radar.prototype.updateSVGPosition = function(objRemote, time) {
    //    var objPos = objRemote.position(time);
    //    
    //    var x = 600 * (objPos[0] - this.parent.worldBounds[0]) / (this.parent.worldBounds[1] - this.parent.worldBounds[0]);
    //    var y = 600 * (objPos[2] - this.parent.worldBounds[4]) / (this.parent.worldBounds[5] - this.parent.worldBounds[4]);
    //    
    //    objRemote.svgObj.setPosition(x, y);
    //}
    //
    ////** Updates radar display */
    //Lemmings.Behavior.Radar.prototype.updateRadar = function() {
    //    // select the moment to compute object positions for
    //    var now = new Date();
    //    
    //    // update all tracked objects
    //    for (objid in this.trackedObjs)
    //        this.updateSVGPosition(this.trackedObjs[objid], now);
    //}
    
    /** 
     * Stops tracking remote presence.
     *
     * @param presence Our presence.
     * @param remoteID Remote presence ID.
     */
    Lemmings.Behavior.Radar.prototype.stopTracking = function(presenceID, remotePresenceID) {
        var remoteID = remotePresenceID.object();
        if (!this.trackedObjs[presenceID] || !this.trackedObjs[presenceID][remoteID]) {
            Kata.warn("Tried to stop tracking object that is not tracked.");
            return;
        }
        
        // remove remote presence from tracking array
        delete this.trackedObjs[presenceID][remoteID];
        
        // notify the parent script
        if (this.stopTrackingCallback)
            this.stopTrackingCallback(presenceID, remotePresenceID);
    }
    
    
    
    /** 
     * Handle incoming messages.
     *
     * @param presenceID ID of the presence that has receive the message.
     * @param src Source ODP endpoint.
     * @param dest Destination ODP endpoint.
     * @param payload Byte-stream payload.
     */
    Lemmings.Behavior.Radar.prototype.handleMessage = function(presenceID, src, dest, payload) {
        // deserialize message
        var containerMsg = new Radar.Protocol.Container();
        containerMsg.ParseFromStream(new PROTO.ByteArrayStream(payload));
        
        // handle track message
        if (containerMsg.HasField("track")) {
            this.startTracking(presenceID, src.presenceID(), containerMsg.track);
        }
    }

}, kata_base_offset + 'scripts/behaviors/radar/Radar.js');
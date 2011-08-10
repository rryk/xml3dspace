if (typeof(Lemmings) === "undefined") Lemmings = {};
if (typeof(Lemmings.Behavior) === "undefined") Lemmings.Behavior = {};

Kata.require([
    ['externals/protojs/protobuf.js', 'externals/protojs/pbj.js'],
    kata_base_offset + 'scripts/behaviors/radar/Radar.pbj.js',
    'katajs/core/PresenceID.js'
], function() {

    Lemmings.Behavior.Radar = function(parent, isTrackable, startTrackingCallback, stopTrackingCallback) {
        // save parent object script and register with it
        this.mParent = parent;
        this.mParent.addBehavior(this);
        
        // save trackable flag
        this.mTrackable = isTrackable;
        
        // save callbacks
        this.mStartTrackingCallback = startTrackingCallback;
        this.mStopTrackingCallback = stopTrackingCallback;
        
        // init arrays
        this.mTrackedObjs = {};
        this.mODPPorts = {};
        this.mDelayedRP = {};
        this.mRegisteredRP = {};
    }
    
    // Port used for communication with radar
    Lemmings.Behavior.Radar.prototype.ProtocolPort = 15;
    
    Lemmings.Behavior.Radar.prototype._getODPPort = function(presence) {
        var spaceID = presence.space();
        if (!this.mODPPorts[spaceID])
        {
            var odpPort = presence.bindODPPort(this.ProtocolPort);
            odpPort.receive(Kata.bind(this._handleMessage, this, spaceID));
            this.mODPPorts[spaceID] = odpPort;
        }
        
        return this.mODPPorts[spaceID];
    }
    
    Lemmings.Behavior.Radar.prototype.remotePresence = function(presence, remote, added) {
        //console.log("Radar::remotePresence(presence=" + presence.id() + ", remote=" + remote.id() + ", added=" + (added?"true":"false") + ")");
        
        if (added) {
            if (this.mTrackable)
            {
                // create an intro message
                var trackMsg = new Radar.Protocol.Track();
                trackMsg.type = this.mParent.getType();
                var containerMsg = new Radar.Protocol.Container();
                containerMsg.track = trackMsg;
                
                // send the intro message
                this._getODPPort(presence).send(remote.endpoint(this.ProtocolPort), Lemmings.serializeMessage(containerMsg));
            }
            
            // register remote presence
            var rpKey = remote.presenceID().toString();
            this.mRegisteredRP[rpKey] = true;
            
            // start tracking delayed objects
            var delayedRP = this.mDelayedRP[rpKey];
            if (delayedRP && delayedRP.push)
               for (var i = 0; i < delayedRP.length; i++)
                   delayedRP[i]();
        } else {
            // unregister remote presence
            delete this.mRegisteredRP[remote.presenceID()];
        
            if (this.mTrackedObjs[remote.space()][remote.object()])
                this._stopTracking(presence, remote.presenceID());
        }
    }
    
    Lemmings.Behavior.Radar.prototype.newPresence = function(presence) {
        //console.log("Radar::newPresence(presence=" + presence.id() + ")");
        
        // create ODP port and start listening to messages
        this._getODPPort(presence);
    }
    
    Lemmings.Behavior.Radar.prototype.listTrackedObjects = function(spaceID) {
        if (spaceID)
            if (this.mTrackedObjs[spaceID])
                return this.mTrackedObjs[spaceID];
            else
                return {};
        else
            return this.mTrackedObjs;
    }
    
    Lemmings.Behavior.Radar.prototype.presenceInvalidated = function(presence) {
        // stop tracking all objects from the same presence
        if (this.mTrackedObjs[presence.space()])
            for (var objectID in this.mTrackedObjs[presence.space()])
                this._stopTracking(spaceID, objectID);
        
        // close and remove port
        this._getODPPort(presence).close();
        delete this.mODPPorts[presence.space()];
    }
    
    Lemmings.Behavior.Radar.prototype._startTracking = function(spaceID, objectID, trackMsg) {
        //console.log("Radar::startTracking(presenceID=" + presenceID + ", remotePresenceID=" + remotePresenceID.object() +", trackMsg)");
        
        // add remote presence for tracking
        if (!this.mTrackedObjs[spaceID])
            this.mTrackedObjs[spaceID] = {};
        this.mTrackedObjs[spaceID][objectID] = {
            type: trackMsg.type
        };
        
        // notify parent script
        if (this.mStartTrackingCallback)
        {
            var rpKey = new Kata.PresenceID(spaceID, objectID).toString();
            if (this.mRegisteredRP[rpKey]) {
                this.mStartTrackingCallback(spaceID, objectID, this.mTrackedObjs[spaceID][objectID]);
            } else {
                this.mDelayedRP[rpKey] = this.mDelayedRP[rpKey] ? this.mDelayedRP[rpKey] : [];
                this.mDelayedRP[rpKey].push(
                    Kata.bind(this.mStartTrackingCallback, this, spaceID, objectID, this.mTrackedObjs[spaceID][objectID])
                );
            }
        }
    }
    
    Lemmings.Behavior.Radar.prototype._stopTracking = function(spaceID, objectID) {
        if (!this.mTrackedObjs[spaceID] || !this.mTrackedObjs[spaceID][objectID]) {
            Kata.warn("Tried to stop tracking object that is not tracked.");
            return;
        }
        
        // remove remote presence from tracking array
        delete this.mTrackedObjs[spaceID][objectID];
        
        // notify the parent script
        if (this.mStopTrackingCallback)
            this.mStopTrackingCallback(spaceID, objectID);
    }
    
    /** Callback for incoming messages.
     *  @param {String} spaceID space identifier
     *  @param {Kata.ODP.Endpoint} src source endpoint
     *  @param {Kata.ODP.Endpoint} dest destination endpoint
     *  @param {Array} payload message itself (byte array)
     */
    Lemmings.Behavior.Radar.prototype._handleMessage = function(spaceID, src, dest, payload) {
        // deserialize message
        var containerMsg = new Radar.Protocol.Container();
        containerMsg.ParseFromStream(new PROTO.ByteArrayStream(payload));
        
        // handle track message
        if (containerMsg.HasField("track")) {
            this._startTracking(spaceID, src.object(), containerMsg.track);
        }
    }

}, kata_base_offset + 'scripts/behaviors/radar/Radar.js');
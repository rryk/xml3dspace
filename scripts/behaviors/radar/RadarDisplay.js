if (typeof(Lemmings) === "undefined") Lemmings = {};
if (typeof(Lemmings.Behavior) === "undefined") Lemmings.Behavior = {};

Kata.require([
    kata_base_offset + 'scripts/Tools.js',
    'katajs/core/PresenceID.js'
], function() {

    /** 
     * Constructs new RadarDisplay behavior. RadarDisplay is designed to track other objects
     * in the world and communicate their position to the DisplayUI on the client.
     *
     * @param parent parent object script
     */
    Lemmings.Behavior.RadarDisplay = function(parent, worldBounds, updateInterval) {
        // save parent object script and register with it
        this.mParent = parent;
        this.mParent.addBehavior(this);
        
        // initialize object list
        this.mObjects = {};
        this.mNumObjects = 0;
        
        // save world bounds
        this.mWorldBounds = worldBounds;
        
        // save update interval
        this.mUpdateInterval = updateInterval ? updateInterval : 100;
    }
    
    /** Returns start tracking callback */
    Lemmings.Behavior.RadarDisplay.prototype.getStartTrackingCallback = function() {
        return Kata.bind(this.startTracking, this);
    }
    
    /** Returns stop tracking callback */
    Lemmings.Behavior.RadarDisplay.prototype.getStopTrackingCallback = function() {
        return Kata.bind(this.stopTracking, this);
    }
    
    /** Starts tracking object on the radar display.
     *
     *  @param spaceID Space identifier.
     *  @param objectID Object identifier.
     *  @param object Object record.
     */
    Lemmings.Behavior.RadarDisplay.prototype.startTracking = function(spaceID, objectID, object) {
        var remotePresenceID = new Kata.PresenceID(spaceID, objectID);
        var rpKey = remotePresenceID.toString();
        if (this.mObjects[rpKey]) {
            Kata.warn("Tried to start tracking an object twice.");
            return;
        }
        
        // add object to the tracking object list
        this.mObjects[rpKey] = this.mParent.getRemotePresence(remotePresenceID);
        this.mNumObjects++;

        // send create message to DisplayUI
        var msg = new Kata.ScriptProtocol.FromScript.GUIMessage("display", {
            action: "create",
            id: rpKey,
            type: object.type,
            size: this.mObjects[rpKey].predictedScale()[3]
        });
        this.mParent._sendHostedObjectMessage(msg);
        
        // start tracking if needed
        if (this.mNumObjects == 1)
            this.mUpdateIntervalHandle = setInterval(Kata.bind(this.update, this), this.mUpdateInterval);
    }
    
    /** Stops tracking the object.
     *
     *  @param spaceID Space identifier.
     *  @param objectID Object identifier.
     */
    Lemmings.Behavior.RadarDisplay.prototype.stopTracking = function(spaceID, objectID) {
        var id = new PresenceID(spaceID, objectID).toString();
        if (!this.mObjects[id]) {
            Kata.warn("Tried to stop tracking the object that is not tracked.");
            return;
        }
        
        // send delete message to DisplayUI
        var msg = new Kata.ScriptProtocol.FromScript.GUIMessage("delete", {
            action: "delete",
            id: id,
        });
        this.mParent._sendHostedObjectMessage(msg);
        
        // remove object from the tracking object list
        delete this.mObjects[id];
        this.mNumObjects--;
        
        // stop tracking if needed
        if (this.mNumObjects == 0)
            clearInterval(this.mUpdateIntervalHandle);
    }
    
    /** Updates positions of all objects on radar. */
    Lemmings.Behavior.RadarDisplay.prototype.update = function() {
        var now = Kata.now(this.mParent.space);
        for (var id in this.mObjects)
        {
            // retrieve current position
            var obj = this.mObjects[id];
            var position = obj.position(now);
            
            // send move message to DisplayUI
            if (!obj.lastPosition || !Lemmings.equalPositions(obj.lastPosition, position))
            {
                var msg = new Kata.ScriptProtocol.FromScript.GUIMessage("display", {
                    action: "move",
                    id: id,
                    pos: position
                });
                this.mParent._sendHostedObjectMessage(msg);
                obj.lastPosition = position;
            } 
        }
    }

}, kata_base_offset + 'scripts/behaviors/RadarDisplay/RadarDisplay.js');
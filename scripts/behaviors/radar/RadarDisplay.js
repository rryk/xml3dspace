if (typeof(Lemmings) === "undefined") Lemmings = {};
if (typeof(Lemmings.Behavior) === "undefined") Lemmings.Behavior = {};

Kata.require([
    kata_base_offset + 'scripts/Tools.js'
], function() {

    /** 
     * Constructs new RadarDisplay behavior. RadarDisplay is designed to track other objects
     * in the world and communicate their position to the DisplayUI on the client.
     *
     * @param parent parent object script
     */
    Lemmings.Behavior.RadarDisplay = function(parent, worldBounds, updateInterval) {
        // save parent object script and register with it
        this.parent = parent;
        this.parent.addBehavior(this);
        
        // init tracked objects array
        this.trackedObjs = {};
        
        // initialize object list
        this.objects = {};
        this.numObjects = 0;
        
        // save world bounds
        this.worldBounds = worldBounds;
        
        // save update interval
        this.updateInterval = updateInterval ? updateInterval : 100;
    }
    
    /** Returns start tracking callback */
    Lemmings.Behavior.RadarDisplay.prototype.getStartTrackingCallback = function() {
        return Kata.bind(this.startTracking, this);
    }
    
    /** Returns stop tracking callback */
    Lemmings.Behavior.RadarDisplay.prototype.getStopTrackingCallback = function() {
        return Kata.bind(this.stopTracking, this);
    }
    
    /** 
     * Starts tracking object on the radar display.
     *
     * @param presenceID Our presence ID.
     * @param remotePresenceID Object's remote presence ID.
     * @param obj Info on object to be tracked.
     */
    Lemmings.Behavior.RadarDisplay.prototype.startTracking = function(presenceID, remotePresenceID, obj) {
        var id = remotePresenceID.toString();
        if (this.objects[id]) {
            Kata.warn("Tried to start tracking an object twice.");
            return;
        }
        
        // send create message to DisplayUI
        var msg = new Kata.ScriptProtocol.FromScript.GUIMessage("display", {
            action: "create",
            id: id,
            type: obj.type,
            size: obj.size,
            name: obj.name
        });
        this.parent._sendHostedObjectMessage(msg);
        
        // add object to the tracking object list
        this.objects[id] = this.parent.getRemotePresence(remotePresenceID);
        this.numObjects++;
        
        // start tracking if needed
        if (this.numObjects == 1)
            this.updateIntervalHandle = setInterval(Kata.bind(this.update, this), this.updateInterval);
    }
    
    /** Stops tracking the object. */
    Lemmings.Behavior.RadarDisplay.prototype.stopTracking = function(presenceID, remotePresenceID) {
        var id = remotePresenceID.toString();
        if (!this.objects[id]) {
            Kata.warn("Tried to stop tracking the object that is not tracked.");
            return;
        }
        
        // send delete message to DisplayUI
        var msg = new Kata.ScriptProtocol.FromScript.GUIMessage("delete", {
            action: "delete",
            id: id,
        });
        this.parent._sendHostedObjectMessage(msg);
        
        // remove object from the tracking object list
        delete this.objects[id];
        this.numObjects--;
        
        // stop tracking if needed
        if (this.numObjects == 0)
            clearInterval(this.updateIntervalHandle);
    }
    
    /** Updates positions of all objects on radar. */
    Lemmings.Behavior.RadarDisplay.prototype.update = function() {
        var now = new Date();
        for (var id in this.objects)
        {
            // retrieve current position
            var obj = this.objects[id];
            var position = obj.position(now);
            
            // send move message to DisplayUI
            if (!obj.lastPosition || !Lemmings.equalPositions(obj.lastPosition, position))
            {
                var msg = new Kata.ScriptProtocol.FromScript.GUIMessage("display", {
                    action: "move",
                    id: id,
                    pos: position
                });
                this.parent._sendHostedObjectMessage(msg);
                obj.lastPosition = position;
            } 
        }
    }

}, kata_base_offset + 'scripts/behaviors/RadarDisplay/RadarDisplay.js');
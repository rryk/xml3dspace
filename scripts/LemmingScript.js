if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/oh/Script.js',
    kata_base_offset + 'scripts/Tools.js',
    kata_base_offset + 'scripts/behaviors/radar/Radar.js'
], function() {

    var SUPER = Kata.Script.prototype;
    Lemmings.LemmingScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});
        
        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
        
        // add trackable radar for this lemming
        this.radar = new Lemmings.Behavior.Radar(this, true,
            Kata.bind(this.newObjectCallback, this),
            Kata.bind(this.removedObjectCallback, this));
        
        // save lemming's configuration
        this.name = args.name;
        this.posBounds = args.posBounds;
        this.speed = args.speed;
        this.cornerDetectionThreshold = args.cornerDetectionThreshold;
    };
    Kata.extend(Lemmings.LemmingScript, SUPER);
    
    // callback that is triggered when object is connected to the space
    Lemmings.LemmingScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null)
        {
            Kata.error('Failed to connect lemming object to ' + space + '. Reason: ' + reason);
            return;
        }
        
        // save lemmings's world presence
        this.presence = presence;
        
        // start movement (any direction)
        this.planMovement();
    }
    
    // callback that is triggered when new object is located by radar
    Lemmings.LemmingScript.prototype.newObjectCallback = function(presenceID, remotePresenceID, obj) {
        if (obj.type == "box")
        {
            var remote = this.getRemotePresence(remotePresenceID);
            var newObj = {
                pos: remote.position(),
                size: obj.size
            };
            this.objects[remotePresenceID.toString()] = newObj;
            this.planMovement(0, 0, newObj);
        }
    }
    
    // callback that is triggered when an object is lost by radar
    Lemmings.LemmingScript.prototype.removedObjectCallback = function(presenceID, remotePresenceID) {
        if (this.object[remotePresenceID.toString()]) {
            var oldObj = this.object[remotePresenceID.toString()];
            this.planMovement(0, 0, 0, oldObj);
        }
    }
    
    // returns lemming's name
    Lemmings.LemmingScript.prototype.getName = function() {
        return this.name;
    }
    
    // return object's type
    Lemmings.LemmingScript.prototype.getType = function() {
        return "lemming";
    }
    
    // return object's size
    Lemmings.LemmingScript.prototype.getSize = function() {
        return 0.2;
    }
    
    // change lemming's orientation
    Lemmings.LemmingScript.prototype.planMovement = function(newObj, oldObj) {
        // clear previous timeout if any
        if (this.planTimeout)
            window.clearTimeout(this.planTimeout);
        
        if (!newObj && !oldObj) {
            // generate new orientation as we have reached the object or world boundary
            var loc = this.presence.predictedLocationAtTime(new Date());
            
            if (this.bounds && this.closestBoundaryIndex) {
                var minAng = this.bounds[this.closestBoundaryIndex].minAng;
                var maxAng = this.bounds[this.closestBoundaryIndex].maxAng;
            } else {
                minAng = 0;
                maxAng = 2 * Math.PI;
            }
            
            loc = Lemmings.randomizeOrientationWithBoundInXZAndUpdateVelocity(loc, this.speed, minAng, maxAng);
            this.presence.setLocation(loc);
        } else if (newObj) {
            // TODO: update closest boundary by comparing to new object only
        } else if (oldObj) {
            // TODO: find closest boundary from the rest of objects
        }
        
        // send a location update to the space server
        
        
        this.bounds = [];
        
        // compute bounds for the world boundary
        if (loc.vel[0] > 0) {
            this.bounds.push({
                time: (this.posBounds[1] - loc.pos[0]) / loc.vel[0],
                minAng: Math.PI,
                maxAng: Math.PI * 2
            });
        } else if (loc.vel[0] < 0) {
            this.bounds.push({
                time: (loc.pos[0] - this.posBounds[0]) / (-loc.vel[0]),
                minAng: 0,
                maxAng: Math.PI
            });
        }
        
        if (loc.vel[2] > 0) {
            this.bounds.push({
                time: (this.posBounds[5] - loc.pos[2]) / loc.vel[2],
                minAng: -Math.PI / 2,
                maxAng: Math.PI / 2,
            });
        } else if (loc.vel[2] < 0) {
            this.bounds.push({
                time: (loc.pos[2] - this.posBounds[4]) / (-loc.vel[2]),
                minAng: Math.PI / 2,
                maxAng: 3 * Math.PI / 2,
            });
        }
        
        for (var obj in this.objects) {
            // TODO: compute boundary for obj
        }
        
        // find closes boundary
        this.closestBoundaryIndex = 0;
        for (var index = 1; index < this.bounds.length; index++)
            if (this.bounds[index].time < this.bounds[this.closestBoundaryIndex].time)
                this.closestBoundaryIndex = index;
        
        // schedule next planning
        // Note: Math.max here is needed because we may get negative bound reach time if we will happen to be in the corner
        var time = this.bounds[this.closestBoundaryIndex].time;
        this.planTimeout = window.setTimeout(Kata.bind(this.planMovement, this), Math.max(0, time * 1000));
    }
    
}, kata_base_offset + "scripts/LemmingScript.js");


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
        this.speed = args.speed;
        this.worldBounds = args.worldBounds;
        this.loc = args.loc;
        
        // initialize object list
        this.objects = {};
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
        this.presence.setLocation(this.loc);
        
        // start movement (any direction)
        this.planMovement();
    }
    
    // callback that is triggered when new object is located by radar
    Lemmings.LemmingScript.prototype.newObjectCallback = function(presenceID, remotePresenceID, obj) {
        if (obj.type == "box")
        {
            var remote = this.getRemotePresence(remotePresenceID);
            var newObj = {
                pos: remote.predictedPosition(new Date()),
                size: obj.size
            };
            this.objects[remotePresenceID.toString()] = newObj;
            setTimeout(Kata.bind(this.planMovement, this, newObj), 100);
        }
    }
    
    // callback that is triggered when an object is lost by radar
    Lemmings.LemmingScript.prototype.removedObjectCallback = function(presenceID, remotePresenceID) {
        if (this.object[remotePresenceID.toString()]) {
            var oldObj = this.object[remotePresenceID.toString()];
            this.planMovement(0, oldObj);
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
            
        // get current location
        var now = new Date();
        var loc = this.presence.predictedLocationAtTime(now);
        
        if (loc.pos[0] < this.worldBounds[0]-1 || loc.pos[0] > this.worldBounds[1]+1 || loc.pos[2] < this.worldBounds[4]-1 || loc.pos[2] > this.worldBounds[5]+1) {
            //Kata.warn("object is outside the world boundaries, moving to origin");
            loc.pos = [0, 0, 0];
            this.presence.setLocation(loc);
        }
        
        if (!newObj && !oldObj) {
            // generate new orientation as we have reached the object or world boundary
            if (this.bounds && this.closestBoundary) {
                var minAng = this.bounds[this.closestBoundary].minAng;
                var maxAng = this.bounds[this.closestBoundary].maxAng;
            } else {
                minAng = 0;
                maxAng = 2 * Math.PI;
            }
            
            // randomize new orientation
            loc = Lemmings.randomizeOrientationWithBoundInXZAndUpdateVelocity(loc, this.speed, minAng, maxAng);
            
            // send a location update to the space server
            this.presence.setLocation(loc);
        } else if (newObj) {
            // TODO: update closest boundary by comparing to new object only
        } else if (oldObj) {
            // TODO: find closest boundary from the rest of objects
        }
        
        // start recomputing
        this.bounds = {};
        
        // compute bounds for the world boundary
        if (loc.vel[0] > 0) {
            this.bounds["right-world-boundary"] = {
                time: (this.worldBounds[1] - loc.pos[0]) / loc.vel[0],
                minAng: Math.PI,
                maxAng: Math.PI * 2
            };
        } else if (loc.vel[0] < 0) {
            this.bounds["left-world-boundary"] = {
                time: (loc.pos[0] - this.worldBounds[0]) / (-loc.vel[0]),
                minAng: 0,
                maxAng: Math.PI
            };
        }
        
        if (loc.vel[2] > 0) {
            this.bounds["top-world-boundary"] = {
                time: (this.worldBounds[5] - loc.pos[2]) / loc.vel[2],
                minAng: -Math.PI / 2,
                maxAng: Math.PI / 2,
            };
        } else if (loc.vel[2] < 0) {
            this.bounds["bottom-world-boundary"] = {
                time: (loc.pos[2] - this.worldBounds[4]) / (-loc.vel[2]),
                minAng: Math.PI / 2,
                maxAng: 3 * Math.PI / 2,
            };
        }
        
        for (var objID in this.objects) {
            var obj = this.objects[objID];
            var dist = Lemmings.distToObject(loc.pos, loc.vel, obj.pos, obj.size);
            if (dist > 0) {
                var angles = Lemmings.reflectionAngles(loc.pos, loc.vel, obj.pos, dist);
                this.bounds[objID] = {
                    time: dist / this.speed,
                    minAng: angles.min,
                    maxAng: angles.max
                };
            }
        }
        
        // find closest boundary
        this.closestBoundary = "";
        for (var b in this.bounds)
            if (this.closestBoundary === "" || this.bounds[b].time < this.bounds[this.closestBoundary].time)
                this.closestBoundary = b;
        
        // schedule next planning
        // Note: Math.max here is needed because reach time may get negative when object will be slightly behind the
        //       world boundary. FIXME: Shouldn't we ignore such boundary?
        var time = this.bounds[this.closestBoundary].time;
        this.planTimeout = window.setTimeout(Kata.bind(this.planMovement, this), Math.max(0, time * 1000));
    }
    
}, kata_base_offset + "scripts/LemmingScript.js");


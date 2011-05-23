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
        this.radar = new Lemmings.Behavior.Radar(this, false);
        
        // save lemming's configuration
        this.name = args.name;
        this.posBounds = args.posBounds;
        this.speed = args.speed;
        this.cornerDetectionThreshold = args.cornerDetectionThreshold;
    };
    Kata.extend(Lemmings.LemmingScript, SUPER);
    
    // callback which is triggered when object is connected to the space
    Lemmings.LemmingScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null)
        {
            Kata.error('Failed to connect lemming object to ' + space + '. Reason: ' + reason);
            return;
        }
        
        // save lemmings's world presence
        this.presence = presence;
        
        // start movement (no bounds yet)
        this.changeOrientation(Lemmings.BoundType.NONE);
    }
    
    // returns lemming's name
    Lemmings.LemmingScript.prototype.getName = function() {
        return this.name;
    }
    
    // return object's type
    Lemmings.LemmingScript.prototype.getType = function() {
        return "lemming";
    }
    
    // change lemming's orientation
    Lemmings.LemmingScript.prototype.changeOrientation = function(bound) {
        // generate new orientation
        var loc = this.presence.predictedLocationAtTime(new Date());
        loc = Lemmings.randomizeOrientationWithBoundInXZAndUpdateVelocity(loc, this.speed, bound);
        
        // send a location update to the space server
        this.presence.setLocation(loc);
        
        // compute bounds' reach time for X and Z axes
        if (loc.vel[0] > 0) {
            var boundReachTime1 = (this.posBounds[1] - loc.pos[0]) / loc.vel[0];
            
            //var newZ = loc.pos[2] + loc.vel[2] * boundReachTime1;
            //if (newZ < this.posBounds[4] + this.cornerDetectionThreshold)
            //    var boundType1 = Lemmings.BoundType.MAXX_MINZ;
            //else if (newZ > this.posBounds[5] - this.cornerDetectionThreshold)
            //    var boundType1 = Lemmings.BoundType.MAXX_MAXZ;
            //else
                var boundType1 = Lemmings.BoundType.MAXX;
            
        } else if (loc.vel[0] < 0) {
            var boundReachTime1 = (loc.pos[0] - this.posBounds[0]) / (-loc.vel[0]);
            
            //var newZ = loc.pos[2] + loc.vel[2] * boundReachTime1;
            //if (newZ < this.posBounds[4] + this.cornerDetectionThreshold)
            //    var boundType1 = Lemmings.BoundType.MINX_MINZ;
            //else if (newZ > this.posBounds[5] - this.cornerDetectionThreshold)
            //    var boundType1 = Lemmings.BoundType.MINX_MAXZ;
            //else
                var boundType1 = Lemmings.BoundType.MINX;
        }
        
        if (loc.vel[2] > 0) {
            var boundReachTime2 = (this.posBounds[5] - loc.pos[2]) / loc.vel[2];
            
            //var newX = loc.pos[0] + loc.vel[0] * boundReachTime2;
            //if (newX < this.posBounds[0] + this.cornerDetectionThreshold)
            //    var boundType2 = Lemmings.BoundType.MINX_MAXZ;
            //else if (newX > this.posBounds[1] - this.cornerDetectionThreshold)
            //    var boundType2 = Lemmings.BoundType.MAXX_MAXZ;
            //else
                var boundType2 = Lemmings.BoundType.MAXZ;
        } else if (loc.vel[2] < 0) {
            var boundReachTime2 = (loc.pos[2] - this.posBounds[4]) / (-loc.vel[2]);
            
            //var newX = loc.pos[0] + loc.vel[0] * boundReachTime2;
            //if (newX < this.posBounds[0] + this.cornerDetectionThreshold)
            //    var boundType2 = Lemmings.BoundType.MINX_MINZ;
            //else if (newX > this.posBounds[1] - this.cornerDetectionThreshold)
            //    var boundType2 = Lemmings.BoundType.MAXX_MINZ;
            //else
                var boundType2 = Lemmings.BoundType.MINZ;
        }
        
        // schedule next orientation change
        // Note: Math.max here is needed because we may get negative bound reach time if we will happen to be in the corner
        if (boundReachTime1 < boundReachTime2)
            window.setTimeout(Kata.bind(this.changeOrientation, this, boundType1), Math.max(0, boundReachTime1 * 1000));
        else
            window.setTimeout(Kata.bind(this.changeOrientation, this, boundType2), Math.max(0, boundReachTime2 * 1000));
    }
    
}, kata_base_offset + "scripts/LemmingScript.js");


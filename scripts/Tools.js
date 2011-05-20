if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/core/Location.js',
], function() {
    
    Lemmings.randomizePositionInXZ = function(posBounds) {
        var randomLocation = Kata.LocationIdentityNow();
        
        // randomize position
        randomLocation.pos.x = Math.random() * (posBounds[1] - posBounds[0]) + posBounds[0];
        randomLocation.pos.y = Math.random() * (posBounds[3] - posBounds[2]) + posBounds[2];
        randomLocation.pos.z = Math.random() * (posBounds[5] - posBounds[4]) + posBounds[4];
        
        return randomLocation;
    }
    
    Lemmings.randomizeOrientationWithBoundInXZAndUpdateVelocity = function(oldLocation, speed, bound) {
        var newLocation = {};
        Kata.LocationCopy(newLocation, oldLocation);
        
        // randomize orientation
        var axis = [0, 1, 0];
        if (bound == Lemmings.BoundType.MINX)
            var angle = Math.random() * Math.PI;
        else if (bound == Lemmings.BoundType.MAXX)
            var angle = Math.random() * Math.PI + Math.PI;
        else if (bound == Lemmings.BoundType.MINZ)
            var angle = Math.random() * Math.PI + Math.PI / 2;
        else if (bound == Lemmings.BoundType.MAXZ)
            var angle = Math.random() * Math.PI - Math.PI / 2;
        else if (bound == Lemmings.BoundType.MINX_MINZ)
            var angle = Math.random() * Math.PI / 2 + Math.PI / 2;
        else if (bound == Lemmings.BoundType.MINX_MAXZ)
            var angle = Math.random() * Math.PI / 2;
        else if (bound == Lemmings.BoundType.MAXX_MINZ)
            var angle = Math.random() * Math.PI / 2 + Math.PI;
        else if (bound == Lemmings.BoundType.MAXX_MAXZ)
            var angle = Math.random() * Math.PI / 2 - Math.PI / 2;
        else if (bound == Lemmings.BoundType.NONE)
            var angle = Math.random() * 2 * Math.PI;
        else
            Kata.error("Unrecognized bound type.");
            
        // convert axis-angle to quaternion
        // TODO: we assume that avatar is originally facing -Z direction, which may
        //       not be the same for Sirikata and thus generated orientation will
        //       differ from movement direction as computed in the next statement
        newLocation.orient = Kata._helperQuatFromAxisAngle(axis, angle);
        
        // update velocity (assume 0 degrees is facing -Z direction, vector up is [0, 1, 0])
        newLocation.vel = [Math.sin(angle) * speed, 0, -Math.cos(angle) * speed];
                              
        return newLocation;
    }
    
    Lemmings.BoundType = {
        MINX: 1,
        MAXX: 2,
        MINZ: 3,
        MAXZ: 4,
        MINX_MINZ: 5,
        MINX_MAXZ: 6,
        MAXX_MINZ: 7,
        MAXX_MAXZ: 8,
        NONE: 9
    };

}, kata_base_offset + "scripts/LemmingTools.js");
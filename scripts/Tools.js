if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/core/Location.js',
], function() {
    
    Lemmings.randomizePositionInXZ = function(posBounds) {
        var randomLocation = Kata.LocationIdentityNow();
        
        // randomize position
        randomLocation.pos[0] = Math.random() * (posBounds[1] - posBounds[0]) + posBounds[0];
        randomLocation.pos[1] = Math.random() * (posBounds[3] - posBounds[2]) + posBounds[2];
        randomLocation.pos[2] = Math.random() * (posBounds[5] - posBounds[4]) + posBounds[4];
        
        return randomLocation;
    }
    
    Lemmings.randomizeOrientationWithBoundInXZAndUpdateVelocity = function(oldLocation, speed, minAngle, maxAngle) {
        var newLocation = {};
        Kata.LocationCopy(newLocation, oldLocation);
        
        // randomize orientation
        var axis = [0, 1, 0];
        var angle = (maxAngle - minAngle) * Math.random() + minAngle;
            
        // convert axis-angle to quaternion
        // TODO: we assume that avatar is originally facing -Z direction, which may
        //       not be the same for Sirikata and thus generated orientation will
        //       differ from movement direction as computed in the next statement
        newLocation.orient = Kata._helperQuatFromAxisAngle(axis, angle);
        
        // update velocity (assume 0 degrees is facing -Z direction, vector up is [0, 1, 0])
        newLocation.vel = [Math.sin(angle) * speed, 0, -Math.cos(angle) * speed];
                              
        return newLocation;
    }
    
    Lemmings.serializeMessage = function(msg) {
        var serialized = new PROTO.ByteArrayStream();
        msg.SerializeToStream(serialized);
        return serialized.getArray();
    };
    
    Lemmings.isNumber = function(val) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
    
    Lemmings.equalPositions = function(position1, position2) {
        return position1[0] == position2[0] && position1[1] == position2[1] && position1[2] == position2[2];
    }

}, kata_base_offset + "scripts/LemmingTools.js");
if (typeof(Lemmings) === "undefined") Lemmings = {};

Kata.require([
    'katajs/core/Location.js',
], function() {

    var EPS = 0.0000001;
    
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
    
    Lemmings.len = function(vec) {
        if (vec.length == 2) {
            return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
        } else if (vec.length == 2) {
            return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
        }
    }
    
    Lemmings.normalize = function(vec, lenP) {
        var len = lenP ? lenP : Lemmings.len(vec);
        if (vec.length == 2)
            return [vec[0] / len, vec[1] / len];
        else if (vec.length == 3)
            return [vec[0] / len, vec[1] / len, vec[2] / len];
        else
            Kata.error("Only 2D and 3D vectors are supported.");
    }
    
    Lemmings.dot = function(vec1, vec2) {
        if (vec1.length == 2) {
            return vec1[0] * vec2[0] + vec1[1] * vec2[1];
        } else if (vec1.length == 3) {
            return vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
        }
    }
    
    Lemmings.distToObject = function(pos, dir, center, radius) {
        // v1 - vector from origin to object center
        // v2 - direction vector
        var v1 = [center[0] - pos[0], center[2] - pos[2]];
        var v2 = [dir[0], dir[2]];
        var v1_len = Lemmings.len(v1);
        
        // early ray termination - check if we are inside of the object
        if (v1_len < radius) return -1;
        
        // early ray termination - check if object is behind the ray
        var d = Lemmings.dot(Lemmings.normalize(v1, v1_len), Lemmings.normalize(v2)); // cosine of the angle between v1 and v2
        if (d < EPS) return -1;
        
        // early ray termination - check if object intersects bounding circle
        var p = v1_len * Math.sqrt(1 - d * d);
        if (p > radius) return -1;
        
        // compute actual distance to the object
        return v1_len * d - Math.sqrt(radius * radius - p * p);
    }
    
    Lemmings.signedAngle = function(vec1, vec2) {
        var d = vec1[0]*vec2[0] + vec1[1]*vec2[1];
        var p = vec1[0]*vec2[1] - vec1[1]*vec2[0];
        return Math.atan2(p, d);
    }
    
    Lemmings.reflectionAngles = function(pos, dir, center, dist) {
        var t = [pos[0] + dir[0] * dist, pos[2] + dir[2] * dist]; // intersection point
        var c = [center[0], center[2]]; // circle center
        var v = [t[0] - c[0], t[1] - c[1]]; // radius vector to intersection point
        var v2 = [v[1], -v[0]]; // rotate radius vector 90 deg clockwise
        var m = Lemmings.signedAngle([0, -1], v2);
        return {min: m, max: m + Math.PI};
    }

    /** Distance between two points
     *
     *  @param {Array} p1 first point (float array)
     *  @param {Array} p2 second point (float array)
     */
    Lemmings.distance = function(p1, p2) {
        return Math.sqrt((p2[0]-p1[0])*(p2[0]-p1[0]) + (p2[1]-p1[1])*(p2[1]-p1[1]) + (p2[2]-p1[2])*(p2[2]-p1[2]));
    }

}, kata_base_offset + "scripts/LemmingTools.js");
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

        // set object scale (translates into bounding sphere)
        if (!args.loc)
            args.loc = Kata.LocationIdentityNow();
        args.loc.scale = [0, 0, 0, 0.2];

        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));

        // add trackable radar for this lemming
        this.mRadar = new Lemmings.Behavior.Radar(this, true);

        // save lemming's configuration
        this.mSpeed = args.speed;
        this.mWorldBounds = args.worldBounds;
        this.mLoc = args.loc;
        this.mSpace = args.space;
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
        this.mPresence = presence;
        this.mPresence.setLocation(this.mLoc);

        // scheck for obstracles regularly
        this.interval = setInterval(Kata.bind(this._checkForObstacles, this), 200);
    }

    // // callback that is triggered when new object is located by radar
    // Lemmings.LemmingScript.prototype.newObjectCallback = function(presenceID, remotePresenceID, obj) {
        // if (obj.type == "box")
        // {
            // var remote = this.getRemotePresence(remotePresenceID);
            // var newObj = {
                // pos: remote.predictedPosition(Kata.now(this.mSpace))
            // };
            // this.objects[remotePresenceID.toString()] = newObj;
            // setTimeout(Kata.bind(this.planMovement, this, newObj), 100);
        // }
    // }
    //
    // // callback that is triggered when an object is lost by radar
    // Lemmings.LemmingScript.prototype.removedObjectCallback = function(presenceID, remotePresenceID) {
        // if (this.object[remotePresenceID.toString()]) {
            // var oldObj = this.object[remotePresenceID.toString()];
            // this.planMovement(0, oldObj);
        // }
    // }

    // return object's type
    Lemmings.LemmingScript.prototype.getType = function() {
        return "lemming";
    }

    // change lemming's orientation
    Lemmings.LemmingScript.prototype._checkForObstacles = function() {
        if (!this.mPresence)
            return;

        var lemmingPosition = this.mPresence.predictedPosition();
        var lemmingScale = this.mPresence.predictedScale();

        var objs = this.mRadar.listTrackedObjects(this.mPresence);
        for (var id in objs)
        {
            var obj = this.getRemotePresence(new Presence(this.mSpace, id));
            var objPosition = obj.predictedPosition();
            var objScale = obj.predictedScale();

            // TODO: collision detection (within next 200 ms)

            // bounding sphere intersection test
            if (Lemmings.distance(lemmingPosition, objPosition) < (objScale + lemmingScale))
            {

            }
        }


        // // clear previous timeout if any
        // if (this.planTimeout)
            // window.clearTimeout(this.planTimeout);

        // // get current location
        // var now = Kata.now(this.mSpace);
        // var loc = this.mPresence.predictedLocationAtTime(now);

        // if (loc.pos[0] < this.mWorldBounds[0]-1 || loc.pos[0] > this.mWorldBounds[1]+1 || loc.pos[2] < this.mWorldBounds[4]-1 || loc.pos[2] > this.mWorldBounds[5]+1) {
            // //Kata.warn("object is outside the world boundaries, moving to origin");
            // loc.pos = [0, 0, 0];
            // this.mPresence.setLocation(loc);
        // }

        // if (!newObj && !oldObj) {
            // // generate new orientation as we have reached the object or world boundary
            // if (this.bounds && this.closestBoundary) {
                // var minAng = this.bounds[this.closestBoundary].minAng;
                // var maxAng = this.bounds[this.closestBoundary].maxAng;
            // } else {
                // minAng = 0;
                // maxAng = 2 * Math.PI;
            // }

            // // randomize new orientation
            // loc = Lemmings.randomizeOrientationWithBoundInXZAndUpdateVelocity(loc, this.mSpeed, minAng, maxAng);

            // // send a location update to the space server
            // this.mPresence.setLocation(loc);
        // } else if (newObj) {
            // // TODO: update closest boundary by comparing to new object only
        // } else if (oldObj) {
            // // TODO: find closest boundary from the rest of objects
        // }

        // // start recomputing
        // this.bounds = {};

        // // compute bounds for the world boundary
        // if (loc.vel[0] > 0) {
            // this.bounds["right-world-boundary"] = {
                // time: (this.mWorldBounds[1] - loc.pos[0]) / loc.vel[0],
                // minAng: Math.PI,
                // maxAng: Math.PI * 2
            // };
        // } else if (loc.vel[0] < 0) {
            // this.bounds["left-world-boundary"] = {
                // time: (loc.pos[0] - this.mWorldBounds[0]) / (-loc.vel[0]),
                // minAng: 0,
                // maxAng: Math.PI
            // };
        // }

        // if (loc.vel[2] > 0) {
            // this.bounds["top-world-boundary"] = {
                // time: (this.mWorldBounds[5] - loc.pos[2]) / loc.vel[2],
                // minAng: -Math.PI / 2,
                // maxAng: Math.PI / 2,
            // };
        // } else if (loc.vel[2] < 0) {
            // this.bounds["bottom-world-boundary"] = {
                // time: (loc.pos[2] - this.mWorldBounds[4]) / (-loc.vel[2]),
                // minAng: Math.PI / 2,
                // maxAng: 3 * Math.PI / 2,
            // };
        // }

        // for (var objID in this.objects) {
            // var obj = this.objects[objID];
            // var dist = Lemmings.distToObject(loc.pos, loc.vel, obj.pos, obj.size);
            // if (dist > 0) {
                // var angles = Lemmings.reflectionAngles(loc.pos, loc.vel, obj.pos, dist);
                // this.bounds[objID] = {
                    // time: dist / this.mSpeed,
                    // minAng: angles.min,
                    // maxAng: angles.max
                // };
            // }
        // }

        // // find closest boundary
        // this.closestBoundary = "";
        // for (var b in this.bounds)
            // if (this.closestBoundary === "" || this.bounds[b].time < this.bounds[this.closestBoundary].time)
                // this.closestBoundary = b;
    }

}, kata_base_offset + "scripts/LemmingScript.js");


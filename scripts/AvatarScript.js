if (typeof(FIContent) === "undefined") FIContent = {};

Kata.require([
    'katajs/oh/GraphicsScript.js',
    kata_base_offset + "scripts/Tools.js",
    kata_base_offset + "scripts/behavior/animated/Animated.js",
], function() {

    var SUPER = Kata.GraphicsScript.prototype;
    FIContent.AvatarScript = function(channel, args) {
        // initialize avatar in the origin
        this.initialLocation = args.loc;

        // call parent constructor
        SUPER.constructor.call(this, channel, args, Kata.bind(this.updateAnimation, this));

        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));

        // info about pressed keys
        this.keyIsDown = {};

        // initial camera offsets
        this.cameraOrientOffset = Kata.Quaternion.identity();
        this.cameraPosOffset = [0, 2, 5];

        // add animated behavior
        this.mAnimatedBehavior =
            new FIContent.Behavior.Animated(
                this,
                {
                    idle: 'idle',
                    forward: 'walk'
                },
                Kata.bind(this.animatedSetState, this)
            );
    };
    Kata.extend(FIContent.AvatarScript, SUPER);

    // update animated state for remote object
    FIContent.AvatarScript.prototype.animatedSetState = function(remote, state) {
        remote._animatedState = state;
        this.updateGFX(remote);
    };

    FIContent.AvatarScript.prototype.updateAnimation = function(presence, remote){
        var vel = remote.predictedVelocity();
        var angspeed = remote.predictedAngularSpeed();
        var is_mobile = (vel[0] != 0 || vel[1] != 0 || vel[2] != 0 || angspeed != 0);

        var cur_anim = remote.cur_anim;
        var new_anim = (is_mobile ? "walk" : "idle");

        if (cur_anim != new_anim) {
            this.animate(presence, remote, new_anim);
            remote.cur_anim = new_anim;
        }
    };

    // callback which is triggered when object is connected to the space
    FIContent.AvatarScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null) {
            Kata.error('Failed to connect avatar to ' + space + '. Reason: ' + reason);
            return;
        }

        // save box's world presence
        this.presence = presence;

        // enable graphics
        this.enableGraphicsViewport(presence, 0);

        // send a location update to the space server
        this.presence.setLocation(this.initialLocation);

        // set up camera sync
        this.mSyncCameraTimer = setInterval(Kata.bind(this.syncCamera, this), 50);
        this.syncCamera();

        // enable picking messages
        var gfxmsg = new Kata.ScriptProtocol.FromScript.GFXEnableEvent(null, "pick");
        this._sendHostedObjectMessage(gfxmsg);
    }

    FIContent.AvatarScript.prototype.Keys = {
        UP : 38,
        DOWN : 40,
        LEFT : 37,
        RIGHT : 39,
        W : 87,
        A : 65,
        S : 83,
        D : 68
    };

    // Handle incoming GUI messages
    FIContent.AvatarScript.prototype._handleGUIMessage = function(channel, msg) {
        // call to parent class
        Kata.GraphicsScript.prototype._handleGUIMessage.call(this,channel,msg);

        var movementSpeed = 1; // units per second
        var rotationSpeed = 0.07142; // full rotations per second
        var groundLevel = 0.0;
        var upAxis = 1; // y

        var msgType = msg.msg;
        if (msgType == "pick")
            this.lastPickMessage = msg;
        else if (msgType == "mouseup")
        {
            this.originalCamOrient = undefined;
            this.originalCamPosition = undefined;
        }
        else if (msgType == "mousedown")
        {
            this.originalCamOrient = this.cameraOrientOffset;
            this.originalCamPosition = this.cameraPosOffset;
        }
        else if (msgType == "click")
        {
            if (this.lastPickMessage.idHint != "nothing" &&
                FIContent.compareReal(this.lastPickMessage.pos[upAxis], groundLevel))
            {
                var newPos = this.lastPickMessage.pos;
                this.walkTo(newPos, movementSpeed, rotationSpeed);
            }
        }

        else if (msgType == "drag")
        {
            if (msg.event.button == 0)
            {
                var pixelsFor360Turn = 400; // mouse sensitivity

                // rotate camera
                if (this.originalCamOrient !== undefined)
                {
                    // get current offset
                    var curOffset = new XML3DRotation();
                    var origOrient = this.originalCamOrient;
                    curOffset.setQuaternion(new XML3DVec3(origOrient[0], origOrient[1],
                        origOrient[2]), origOrient[3]);

                    // compute added offset
                    var addedOffset = new XML3DRotation(new XML3DVec3(0, 1, 0),
                        -(msg.dx / pixelsFor360Turn) * 2 * Math.PI);

                    // combine and update current offset
                    var newOffset = curOffset.multiply(addedOffset);
                    this.cameraOrientOffset = new Kata.Quaternion(Kata._helperQuatFromAxisAngle([
                        newOffset.axis.x, newOffset.axis.y, newOffset.axis.z], newOffset.angle));

                    // sync camera position
                    this.syncCamera();
                }
            }
            else if (msg.event.button == 2)
            {
                var pixelsForUnitPanning = 50; // mouse sensitivity

                // pan the camera
                if (this.originalCamPosition !== undefined)
                    this.cameraPosOffset = [
                        this.originalCamPosition[0] + msg.dx / pixelsForUnitPanning,
                        this.originalCamPosition[1] - msg.dy / pixelsForUnitPanning,
                        this.originalCamPosition[2]
                    ];
            }
        }
        else if (msg.msg == "keyup")
        {
            this.keyIsDown[msg.keyCode] = false;

            if (msg.keyCode == this.Keys.UP || msg.keyCode == this.Keys.DOWN ||
                msg.keyCode == this.Keys.W || msg.keyCode == this.Keys.S)
                this.presence.setVelocity([0, 0, 0]);
            else if (msg.keyCode == this.Keys.LEFT || msg.keyCode == this.Keys.RIGHT ||
                     msg.keyCode == this.Keys.A || msg.keyCode == this.Keys.D)
                this.presence.setAngularVelocity(Kata.Quaternion.identity());
        }
        else if (msg.msg == "keydown")
        {
            var avMat = Kata.QuaternionToRotation(this.presence.predictedOrientation(new Date()));

            var avXX = avMat[0][0] * movementSpeed;
            var avXY = avMat[0][1] * movementSpeed;
            var avXZ = avMat[0][2] * movementSpeed;
            var avZX = avMat[2][0] * movementSpeed;
            var avZY = avMat[2][1] * movementSpeed;
            var avZZ = avMat[2][2] * movementSpeed;
            this.keyIsDown[msg.keyCode] = true;

            if (this.keyIsDown[this.Keys.UP]||this.keyIsDown[this.Keys.W]) {
                this.stopAutomaticWalking();
                var loc = this.presence.predictedLocationAtTime(new Date());
                this.presence.setVelocity([-avZX, -avZY, -avZZ]);
            }

            // TODO: implement reversed animation playback and then re-enable moving backwards.
            //if (this.keyIsDown[this.Keys.DOWN]||this.keyIsDown[this.Keys.S]) {
            //    this.presence.setVelocity([avZX, avZY, avZZ]);
            //}

            if (this.keyIsDown[this.Keys.LEFT]||this.keyIsDown[this.Keys.A]) {
                this.stopAutomaticWalking();
                this.presence.setAngularVelocity(
                    Kata.Quaternion.fromAxisAngle([0, 1, 0], 2.0 * Math.PI * rotationSpeed)
                );
            }
            if (this.keyIsDown[this.Keys.RIGHT]||this.keyIsDown[this.Keys.D]) {
                this.stopAutomaticWalking();
                this.presence.setAngularVelocity(
                    Kata.Quaternion.fromAxisAngle([0, 1, 0], -2.0 * Math.PI * rotationSpeed)
                );
            }
        }

        this.updateGFX(this.presence);
    }

    FIContent.AvatarScript.prototype.stopAutomaticWalking = function() {
        // clear walking interval if any
        if (this.automaticWalkingTimeout)
        {
            clearInterval(this.automaticWalkingTimeout);
            this.presence.setVelocity([0, 0, 0]);
            this.presence.setAngularVelocity(Kata.Quaternion.identity());

            delete this.automaticWalkingTimeout;
        }
    }

    FIContent.AvatarScript.prototype.walkTo = function(toPos, movementSpeed, rotationSpeed) {
        var locFrom = this.presence.predictedLocationAtTime(new Date());

        // Stop any previous walking
        this.stopAutomaticWalking();

        // Movement path consists of segments, each of each should be recorded as an element in
        // movementPath array and total number of segments should be stored in numPathSegments. Each
        // record in movementPath should be a dictionary and contiain the following attributes:
        //   startPos - starting position (array of 3 numbers representing a vector),
        //   startOrient - starting orientation (array of 4 number representing a quaternion),
        //   vel - velocity (array of 3 numbers representing a vector),
        //   rotvel - rotational velocity (number representing radians per second),
        //   rotaxis - axis of rotation (array of 3 numbers representing a vector),
        //   dur - duration of the segment (number is seconds).
        // The final position and orientation should be recorded in destination as following:
        //   pos - final position (array of 3 numbers representing a vector),
        //   orient - final orientation (array of 4 number representing a quaternion).

        // Initialize a movement path.
        var numPathSegments = 0;
        var movementPath = [];
        var destination = {};

        // Configure movement path. We perform move in two stages - first we turn around to face the
        // destination and then walk strait.

        // Stage 1. Turn around.
        // Compute rotation axis, angle and velocity.
        var quat1 = new Kata.Quaternion(locFrom.orient);
        var fromDir = quat1.multiply([0, 0, -1]);
        var toDir = [toPos[0] - locFrom.pos[0],
                     toPos[1] - locFrom.pos[1],
                     toPos[2] - locFrom.pos[2]];
        var rot = new XML3DRotation();
        rot.setRotation(new XML3DVec3(fromDir[0], fromDir[1], fromDir[2]),
                        new XML3DVec3(toDir[0], toDir[1], toDir[2]));
        var rotVel = rotationSpeed * 2 * Math.PI;
        numPathSegments = 2;
        movementPath[0] = {
            startPos: locFrom.pos,
            startOrient: locFrom.orient,
            vel: [0, 0, 0],
            rotvel: rotVel,
            rotaxis: [rot.axis.x, rot.axis.y, rot.axis.z],
            dur: Math.abs(rot.angle / rotVel)
        };

        // Stage 2. Walk strait.
        // Compute movement direction and distance.
        var velocityVec = new XML3DVec3(toPos[0] - locFrom.pos[0], toPos[1] - locFrom.pos[1],
            toPos[2] - locFrom.pos[2]).normalize().multiply(new XML3DVec3(movementSpeed,
            movementSpeed, movementSpeed));
        var distance = FIContent.distance(locFrom.pos, toPos);
        var rotQuat = new Kata.Quaternion(Kata._helperQuatFromAxisAngle([rot.axis.x, rot.axis.y,
            rot.axis.z], rot.angle));
        var orient2 = new Kata.Quaternion(locFrom.orient).multiply(rotQuat);
        movementPath[1] = {
            startPos: locFrom.pos,
            startOrient: [orient2[0], orient2[1], orient2[2], orient2[3]],
            vel: [velocityVec.x, velocityVec.y, velocityVec.z],
            rotvel: 0,
            rotaxis: [0, 1, 0],
            dur: distance / movementSpeed
        };

        // Configure destination.
        destination.pos = toPos;
        destination.orient = [orient2[0], orient2[1], orient2[2], orient2[3]];

        // Prepare movement.
        var that = this;
        function executePathSegment(path, numSegments, segmentIndex, presence, destination)
        {
            // Check whether we are finished.
            if (segmentIndex >= numSegments)
            {
                // Move to destination and stop movement.
                var loc = presence.predictedLocationAtTime(new Date());
                loc.pos = destination.pos;
                loc.orient = destination.orient;
                loc.vel = [0, 0, 0];
                loc.rotvel = 0;
                presence.setLocation(loc);
                return;
            }

            var currentSegment = path[segmentIndex];

            // Update location.
            var loc = presence.predictedLocationAtTime(new Date());
            loc.pos = currentSegment.startPos;
            loc.orient = currentSegment.startOrient;
            loc.vel = currentSegment.vel;
            loc.rotvel = currentSegment.rotvel;
            loc.rotaxis = currentSegment.rotaxis;
            presence.setLocation(loc);

            // Schedule next segment execution.
            var nextSegmentIndex = segmentIndex + 1;
            that.automaticWalkingTimeout = setTimeout(
                function() {
                    executePathSegment(path, numSegments, nextSegmentIndex, presence, destination)
                },
                currentSegment.dur * 1000
            );
        }

        // Start movement.
        executePathSegment(movementPath, numPathSegments, 0, this.presence, destination);
    }

    // Camera sync (modified code from BlessedScript.js)
    FIContent.AvatarScript.prototype._getHorizontalOffset = function() {
        return this.cameraPosOffset[0];
    };
    FIContent.AvatarScript.prototype._getVerticalOffset = function(remote) {
        return this.cameraPosOffset[1];
    };
    FIContent.AvatarScript.prototype._getDepthOffset = function(remote) {
        return this.cameraPosOffset[2];
    };
    FIContent.AvatarScript.prototype._calcCamPos = function() {
        var orient = new Kata.Quaternion(this._calcCamOrient());
        var pos = this.presence.predictedPosition(new Date());
        var offset = [this._getHorizontalOffset(), this._getVerticalOffset(this.presence), this._getDepthOffset()];
        var oriented_offset = orient.multiply(offset);
        return [pos[0] + oriented_offset[0],
                pos[1] + oriented_offset[1],
                pos[2] + oriented_offset[2]];
    };
    FIContent.AvatarScript.prototype._calcCamOrient = function(){
        var orient = new Kata.Quaternion(this.presence.predictedOrientation(new Date()));
        var offsetOrient = orient.multiply(this.cameraOrientOffset);
        return [offsetOrient[0], offsetOrient[1], offsetOrient[2], offsetOrient[3]];
    };

    FIContent.AvatarScript.prototype.syncCamera = function() {
        var now = new Date();
        this.setCameraPosOrient(this._calcCamPos(), this._calcCamOrient());
    };

}, kata_base_offset + "scripts/AvatarScript.js");


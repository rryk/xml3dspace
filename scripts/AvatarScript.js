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
            var groundLevel = 0.0;
            var upAxis = 1; // y

            if (FIContent.compareReal(this.lastPickMessage.pos[upAxis], groundLevel))
            {
                var newPos = this.lastPickMessage.pos;
                this.move(newPos);
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

            if ( !this.keyIsDown[this.Keys.UP] && !this.keyIsDown[this.Keys.DOWN])
                this.presence.setVelocity([0, 0, 0]);
            if ( !this.keyIsDown[this.Keys.LEFT] && !this.keyIsDown[this.Keys.RIGHT])
                this.presence.setAngularVelocity(Kata.Quaternion.identity());
        }
        else if (msg.msg == "keydown")
        {
            var avMat = Kata.QuaternionToRotation(this.presence.predictedOrientation(new Date()));

            var avSpeed = 1;
            var full_rot_seconds = 14.0;

            var avXX = avMat[0][0] * avSpeed;
            var avXY = avMat[0][1] * avSpeed;
            var avXZ = avMat[0][2] * avSpeed;
            var avZX = avMat[2][0] * avSpeed;
            var avZY = avMat[2][1] * avSpeed;
            var avZZ = avMat[2][2] * avSpeed;
            this.keyIsDown[msg.keyCode] = true;

            if (this.keyIsDown[this.Keys.UP]||this.keyIsDown[this.Keys.W]) {
                var loc = this.presence.predictedLocationAtTime(new Date());
                this.presence.setVelocity([-avZX, -avZY, -avZZ]);
            }

            // TODO: implement reversed animation playback and then re-enable moving backwards.
            //if (this.keyIsDown[this.Keys.DOWN]||this.keyIsDown[this.Keys.S]) {
            //    this.presence.setVelocity([avZX, avZY, avZZ]);
            //}

            if (this.keyIsDown[this.Keys.LEFT]||this.keyIsDown[this.Keys.A]) {
                this.presence.setAngularVelocity(
                    Kata.Quaternion.fromAxisAngle([0, 1, 0], 2.0*Math.PI/full_rot_seconds)
                );
            }
            if (this.keyIsDown[this.Keys.RIGHT]||this.keyIsDown[this.Keys.D]) {
                this.presence.setAngularVelocity(
                    Kata.Quaternion.fromAxisAngle([0, 1, 0], -2.0*Math.PI/full_rot_seconds)
                );
            }
        }

        this.updateGFX(this.presence);
    }

    FIContent.AvatarScript.prototype.move = function(toPos) {
        var locFrom = this.presence.predictedLocationAtTime(new Date());

        // TODO: implement movement along bezier curve
        console.log("walk from [" + locFrom.pos + "] to [" + toPos + "]");
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


if (typeof(FIContent) === "undefined") FIContent = {};

Kata.require([
    'katajs/oh/GraphicsScript.js',
    kata_base_offset + "scripts/Tools.js",
], function() {

    var SUPER = Kata.GraphicsScript.prototype;
    FIContent.AvatarScript = function(channel, args) {
        // initialize avatar in the origin
        this.initialLocation = args.loc;

        // call parent constructor
        SUPER.constructor.call(this, channel, args, function() {});

        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));
    };
    Kata.extend(FIContent.AvatarScript, SUPER);

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

    // Handle incoming GUI messages
    FIContent.AvatarScript.prototype._handleGUIMessage = function(channel, msg) {
        // call to parent class
        Kata.GraphicsScript.prototype._handleGUIMessage.call(this,channel,msg);

        var msgType = msg.msg;
        if (msgType == "pick")
            this.lastPickMessage = msg;
        else if (msgType == "mouseup")
            this.originalOrientation = undefined;
        else if (msgType == "mousedown")
            this.originalOrientation = this.presence.predictedOrientation(new Date());
        else if (msgType == "click")
        {
            var groundLevel = 0.0;
            var upAxis = 1; // y

            if (FIContent.compareReal(this.lastPickMessage.pos[upAxis], groundLevel))
            {
                var newPos = this.lastPickMessage.pos;

                // TODO: walk to a new position (this.lastPickMessage.position)
                console.log("walk to " + newPos[0] + " " + newPos[1] + " " + newPos[2]);
            }
        }
        else if (msgType == "drag")
        {
            var pixelsFor360Turn = 500; // mouse sensitivity

            // rotate camera
            if (this.originalOrientation !== undefined)
            {
                // convert original orientation into XML3DRotation
                var origOrient = this.originalOrientation;
                var xml3dOrient = new XML3DRotation();
                xml3dOrient.setQuaternion(new XML3DVec3(origOrient[0], origOrient[1], origOrient[2]), origOrient[3]);

                // create rotation
                var xml3dRot = new XML3DRotation(new XML3DVec3(0, 1, 0), -(msg.dx / pixelsFor360Turn) * 2 * Math.PI);

                // compute final orientation
                var xml3dNewOrient = xml3dOrient.multiply(xml3dRot);
                var axis = [xml3dNewOrient.axis.x, xml3dNewOrient.axis.y, xml3dNewOrient.axis.z];
                var angle = xml3dNewOrient.angle;

                // update location
                var loc = this.presence.predictedLocation();
                loc.orient = Kata._helperQuatFromAxisAngle(axis, angle);
                this.presence.setLocation(loc);
            }

            // TODO: walking using keys
            // TODO: correct avatar mesh
            // TODO: implement animations
        }
    }

    // Camera sync (modified code from BlessedScript.js)
    FIContent.AvatarScript.prototype._getVerticalOffset = function(remote) {
        return 1.5;
    };
    FIContent.AvatarScript.prototype._getHorizontalOffset = function() {
        return 3;
    };
    FIContent.AvatarScript.prototype._calcCamPos = function() {
        var orient = new Kata.Quaternion(this._calcCamOrient());
        var pos = this.presence.predictedPosition(new Date());
        var offset = [0, this._getVerticalOffset(this.presence), this._getHorizontalOffset()];
        var oriented_offset = orient.multiply(offset);
        return [pos[0] + oriented_offset[0],
                pos[1] + oriented_offset[1],
                pos[2] + oriented_offset[2]];
    };
    FIContent.AvatarScript.prototype._calcCamOrient = function(){
        return this.presence.predictedOrientation(new Date());
    };
    FIContent.AvatarScript.prototype.syncCamera = function() {
        var now = new Date();
        this.setCameraPosOrient(this._calcCamPos(), this._calcCamOrient());

    };

}, kata_base_offset + "scripts/AvatarScript.js");


if (typeof(VisComp) === "undefined") VisComp = {};

Kata.require([
    'katajs/oh/Script.js',
    kata_base_offset + "scripts/Tools.js",
], function() {

    var SUPER = Kata.Script.prototype;
    VisComp.TileManagerScript = function(channel, args) {
        // call parent constructor
        SUPER.constructor.call(this, channel, args, Kata.bind(this.updateAnimation, this));

        // tile manager will contain common defs section as a mesh
        //args.visual = {mesh: args.mapServer + "?action=getdefs"};
        args.visual = {mesh: "cdn/sky.xml3d"};
        args.loc = {scale: [0, 0, 0, 1000000], pos: [0, 0, 0]};

        // connect to the space server
        this.connect(args, null, Kata.bind(this.connected, this));

        // save arguments
        this.logContainerId = args.logContainerId;
        this.controlsContainerId = args.controlsContainerId;
        this.mapServer = args.mapServer;
        this.defaultArea = args.defaultArea;
        this.defaultZoom = args.defaultZoom;
        this.aggregateLayers = args.aggregateLayers;
        this.space = args.space;

        this.log("Started initialization...");
    };
    Kata.extend(VisComp.TileManagerScript, SUPER);

    VisComp.TileManagerScript.prototype.log = function(message) {
        document.getElementById(this.logContainerId).appendChild(
            document.createTextNode(
                new Date().toLocaleTimeString() + " " + message
            )
        );
        document.getElementById(this.logContainerId).appendChild(
            document.createElement("br")
        );
    }

    // callback which is triggered when object is connected to the space
    VisComp.TileManagerScript.prototype.connected = function(presence, space, reason) {
        // handle connection failure
        if (presence == null) {
            Kata.error('Failed to connect avatar to ' + space + '. Reason: ' + reason);
            return;
        }

        this.log("Sky object connected to " + this.space + ". Loading layers...");

        // save presence
        this.presence = presence;

        // get the list of layers
        var thus = this;
        $.get(this.mapServer, {action: "getlayers"}, function(layers) {
            thus.log("Received information about " + layers.length +  " layers");

            var controls = document.getElementById(thus.controlsContainerId);

            function createCheckbox(id, text) {
                var input = document.createElement("input");
                input.setAttribute("id", "layer_" + id);
                input.setAttribute("type", "checkbox");
                input.setAttribute("checked", "checked");

                var label = document.createElement("label");
                label.setAttribute("for", "layer_" + id);
                label.appendChild(document.createTextNode(text));

                var div = document.createElement("div");
                div.setAttribute("class", "layer");
                div.appendChild(input);
                div.appendChild(label);
                controls.insertBefore(div, controls.firstElementChild);

                return [div, input];
            }

            for (index in layers)
                createCheckbox(layers[index].id, layers[index].val);

            // create all layers checkbox
            var res = createCheckbox("all", "ALL LAYERS");
            res[1].addEventListener("change", function(event) {
                for (var n = controls.firstElementChild; n; n = n.nextElementSibling)
                    if (n.hasAttribute("class") && n.getAttribute("class") == "layer" && n.firstElementChild.getAttribute("id") != "layer_all")
                        n.firstElementChild.checked = res[1].checked;
            });

            // set default values for tile area and enable input fields
            document.getElementById(thus.controlsContainerId + "_minX").setAttribute("value", thus.defaultArea.minX);
            document.getElementById(thus.controlsContainerId + "_maxX").setAttribute("value", thus.defaultArea.maxX);
            document.getElementById(thus.controlsContainerId + "_minY").setAttribute("value", thus.defaultArea.minY);
            document.getElementById(thus.controlsContainerId + "_maxY").setAttribute("value", thus.defaultArea.maxY);
            document.getElementById(thus.controlsContainerId + "_minX").removeAttribute("disabled");
            document.getElementById(thus.controlsContainerId + "_maxX").removeAttribute("disabled");
            document.getElementById(thus.controlsContainerId + "_minY").removeAttribute("disabled");
            document.getElementById(thus.controlsContainerId + "_maxY").removeAttribute("disabled");

            // set action for the button and enable it
            document.getElementById(thus.controlsContainerId + "_create").removeAttribute("disabled");
            document.getElementById(thus.controlsContainerId + "_create").addEventListener("click", Kata.bind(thus.createLayerObjects, thus));
        }, "json");
    }

    VisComp.TileManagerScript.prototype.createDummyObject = function(pos, orient, scale, mesh) {
        var loc = Kata.LocationIdentityNow();
        loc.pos = pos;
        loc.orient = orient;
        loc.scale = scale;

        this.createObject(
                kata_base_offset + "scripts/DummyScript.js",
                "VisComp.DummyScript",
                {
                    space: this.space,
                    visual: {mesh: mesh},
                    loc: loc,
                    logContainerId: this.logContainerId
                });
    }

    VisComp.TileManagerScript.prototype.createLayerObjects = function() {
        // read data from controls
        var minX = document.getElementById(this.controlsContainerId + "_minX").value;
        var maxX = document.getElementById(this.controlsContainerId + "_maxX").value;
        var minY = document.getElementById(this.controlsContainerId + "_minY").value;
        var maxY = document.getElementById(this.controlsContainerId + "_maxY").value;

        var controls = document.getElementById(this.controlsContainerId);
        var layers = [];
        for (var n = controls.firstElementChild; n; n = n.nextElementSibling)
        {
            if (n.hasAttribute("class") && n.getAttribute("class") == "layer")
            {
                var input = n.firstElementChild;
                if (input.getAttribute("id") != "layer_all" && input.checked)
                    layers.push(input.getAttribute("id").substring(6));
            }
        }

        // create layers
        for (var x = minX; x <= maxX; x++)
        {
            for (var y = minY; y <= maxY; y++)
            {
                // FIXME: this values should be computed for each layer
                var pos = [0, 0, 0];
                var orient = [0, 0, 0, 1];
                var bsphere = [0, 0, 0, 1000000]; // [center_x, center_y, center_z, radius]

                var mesh = this.mapServer + "?action=getfullxml3d&&x=" + x + "&&y="
                    + y + "&&z=" + this.zoom;

                for (index in layers)
                {
                    // if we aggregate layers, then just end each layer to the
                    // request URI, otherwise create object for each layer
                    if (this.aggregateLayers)
                        mesh += "&&layers[]=" + layers[index];
                    else
                        this.createDummyObject(pos, orient, bsphere,
                                          mesh + "&&layers[]=" + layers[index]);
                }

                // create aggregated object
                if (this.aggregateLayers)
                    this.createDummyObject(pos, orient, bsphere, mesh);
            }
        }
    }

}, kata_base_offset + "scripts/TileManagerScript.js");


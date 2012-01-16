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
        this.controls = args.controls;
        this.mapServer = args.mapServer;
        this.space = args.space;

        this.log("Started tile server initialization...");
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

        this.log("Sky object connected to " + this.space);
        this.log("Loading list of layers from XML3DMapServer...");

        // save presence
        this.presence = presence;

        // get the list of layers
        var thus = this;
        $.get(this.mapServer, {action: "getlayers"}, function(layers) {
            thus.log("Received information about " + layers.length +  " layers");

            var layerControls = document.getElementById(thus.controls.layers);

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
                layerControls.appendChild(div);

                return input;
            }

            // create all layers checkbox
            var input = createCheckbox("all", "ALL LAYERS");
            input.addEventListener("change", function(event) {
                for (var n = layerControls.firstElementChild; n; n = n.nextElementSibling)
                    if (n.hasAttribute("class") && n.getAttribute("class") == "layer" && n.firstElementChild.getAttribute("id") != "layer_all")
                        n.firstElementChild.checked = input.checked;
            });

            for (index in layers)
                createCheckbox(layers[index].id, layers[index].val);

            // set action for the button
            document.getElementById(thus.controls.create).addEventListener("click", Kata.bind(thus.createLayerObjects, thus));

            // enable controls
            document.getElementById(thus.controls.area.minX).removeAttribute("disabled");
            document.getElementById(thus.controls.area.maxX).removeAttribute("disabled");
            document.getElementById(thus.controls.area.minY).removeAttribute("disabled");
            document.getElementById(thus.controls.area.maxY).removeAttribute("disabled");
            document.getElementById(thus.controls.zoom).removeAttribute("disabled");
            document.getElementById(thus.controls.aggregate).removeAttribute("disabled");
            document.getElementById(thus.controls.create).removeAttribute("disabled");
        }, "json");
    }

    VisComp.TileManagerScript.prototype.createTileObject = function(pos, orient, scale, mesh, x, y, z, layers) {
        var loc = Kata.LocationIdentityNow();
        loc.pos = pos;
        loc.orient = orient;
        loc.scale = scale;

        this.createObject(
                kata_base_offset + "scripts/TileScript.js",
                "VisComp.TileScript",
                {
                    space: this.space,
                    visual: {mesh: mesh},
                    loc: loc,
                    logContainerId: this.logContainerId,
                    mapClientHint: {x: x, y: y, z: z, layers: layers}
                });
    }

    VisComp.TileManagerScript.prototype.createLayerObjects = function() {
        // read data from controls
        var minX = parseFloat(document.getElementById(this.controls.area.minX).value);
        var maxX = parseFloat(document.getElementById(this.controls.area.maxX).value);
        var minY = parseFloat(document.getElementById(this.controls.area.minY).value);
        var maxY = parseFloat(document.getElementById(this.controls.area.maxY).value);
        var zoom = parseInt(document.getElementById(this.controls.zoom).value);
        var aggregate = document.getElementById(this.controls.aggregate).checked;
        var layerControls = document.getElementById(this.controls.layers);
        var layers = [];
        for (var n = layerControls.firstElementChild; n; n = n.nextElementSibling)
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
                    + y + "&&z=" + zoom;

                for (index in layers)
                {
                    // if we aggregate layers, then just end each layer to the
                    // request URI, otherwise create object for each layer
                    if (aggregate)
                        mesh += "&&layers[]=" + layers[index];
                    else
                        this.createTileObject(pos, orient, bsphere,
                            mesh + "&&layers[]=" + layers[index], x, y, zoom, [layers[index]]);
                }

                // create aggregated object
                if (aggregate)
                    this.createTileObject(pos, orient, bsphere, mesh, x, y, zoom, layers);
            }
        }
    }

}, kata_base_offset + "scripts/TileManagerScript.js");


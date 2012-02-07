/*  XML3DSpace Utilities
 *  Tile.js
 *
 *  Copyright (c) 2012, Sergiy Byelozyorov
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Sirikata nor the names of its contributors may
 *    be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

Kata.require([
    ['externals/protojs/protobuf.js','externals/protojs/pbj.js','../../scripts/behavior/tile/Tile.pbj.js']
], function() {

    if (typeof(VisComp.Behavior) == "undefined")
        VisComp.Behavior = {};

    /** Tile allows clients to download and reuse <defs> section for multiple tiles.
     *
     *  @constructor
     *  @param parent {Kata.Script} the parent Script for this behavior
     */
    VisComp.Behavior.Tile = function(parent, tileInfo) {
        this.parent = parent;
        this.parent.addBehavior(this);

        this.tileInfo = tileInfo;
        this.ports = [];

        if (!tileInfo)
            this.loadDefs();
    };

    VisComp.Behavior.Tile.prototype.ProtocolPort = 2353;

    VisComp.Behavior.Tile.prototype._serializeMessage = function(msg) {
        var serialized = new PROTO.ByteArrayStream();
        msg.SerializeToStream(serialized);
        return serialized.getArray();
    };

    VisComp.Behavior.Tile.prototype._getPort = function(pres) {
        var id = pres;
        if (pres.presenceID)
            id = pres.presenceID();
        var odp_port = this.ports[id];
        if (!odp_port && pres.bindODPPort) {
            odp_port = pres.bindODPPort(this.ProtocolPort);
            odp_port.receive(Kata.bind(this._handleMessage, this, pres));
            this.ports[id] = odp_port;
        }
        return odp_port;
    };

    VisComp.Behavior.Tile.prototype.newPresence = function(pres) {
        // When we get a presence, we just set up a listener for
        // messages. The rest is triggered by prox events.
        var odp_port = this._getPort(pres);
    };

    VisComp.Behavior.Tile.prototype.presenceInvalidated = function(pres) {
        var odp_port = this._getPort(pres);
        if (odp_port) {
            odp_port.close();
            delete this.ports[pres.presenceID()];
        }
    };

    VisComp.Behavior.Tile.prototype.remotePresence = function(presence, remote, added) {
        // HACK!
        // remove mesh as it will be reconstructed later with reuse of defs
        if (remote.rMesh.indexOf("sirikataconnect.php") != -1)
            remote.rMesh = emptyMesh;
        // END HACK!

        if (this.tileInfo)
            return;

        if (added) {
            // This protocol is active: when we detect another presence,
            // we try to send it an intro message. This message subscribes us for updates.
            var intro_msg = new Tile.Protocol.Intro();
            var container_msg = new Tile.Protocol.Container();
            container_msg.intro = intro_msg;

            var odp_port = this._getPort(presence);
            odp_port.send(remote.endpoint(this.ProtocolPort), this._serializeMessage(container_msg));
        }
        else {
            // TODO(rryk): When we lose objects, we just make sure we clean up after ourselves
        }
    };

    VisComp.Behavior.Tile.prototype._handleMessage = function(presence, src, dest, payload) {
        // We should be able to just parse a tile info.
        var container_msg = new Tile.Protocol.Container();
        container_msg.ParseFromStream(new PROTO.ByteArrayStream(payload));

        // Handle intro message
        if (this.tileInfo && container_msg.HasField("intro")) {
            var info_msg = new Tile.Protocol.Info();
            info_msg.x = this.tileInfo.x;
            info_msg.y = this.tileInfo.y;
            info_msg.z = this.tileInfo.z;
            info_msg.layers = this.tileInfo.layers;

            var container_msg = new Tile.Protocol.Container();
            container_msg.info = info_msg;

            var odp_port = this._getPort(presence);
            odp_port.send(src, this._serializeMessage(container_msg));
        }

        // Handle info maessage
        if (!this.tileInfo && container_msg.HasField("info")) {
            this.optimizeTile(src.object(), container_msg.info);
        }
    };

    // HACK!
    VisComp.Behavior.Tile.prototype.loadDefs = function() {
        var xml3d = document.getElementsByTagName("xml3d")[0];
        var thus = this;
        xml3d.addEventListener("DOMNodeInserted", function() {
            setTimeout(Kata.bind(thus.runScheduledOptimizations, thus), 0)
        });
        $.ajax({
            type: "GET",
            url: xml3dMapServerBase + "sirikataconnect.php",
            data: {action: "getdefs"},
            success: function(data) {
                for (var node = data.documentElement.firstChild; node; node = node.nextSibling)
                    xml3d.appendChild(document.importNode(node, true));

                function collectIds(node, collection) {
                    if (node.hasAttribute("id") && node.getAttribute("id") != "")
                        collection.push(node.getAttribute("id"));

                    for (var i in node.childNodes)
                        if (node.childNodes[i].nodeType == Node.ELEMENT_NODE)
                            collectIds(node.childNodes[i], collection);
                }

                thus.defsIds = [];
                collectIds(data.documentElement, thus.defsIds);
            },
            async: false,
            dataType: "xml"
        });
    }

    VisComp.Behavior.Tile.prototype.optimizeTile = function(id, info) {
        if (!this.scheduledOptimizations)
            this.scheduledOptimizations = [];

        this.scheduledOptimizations.push([id, info]);
        this.runScheduledOptimizations();
    }

    VisComp.Behavior.Tile.prototype.runScheduledOptimizations = function() {
        if (!this.scheduledOptimizations)
            return;

        if (this.insideRunScheduledOptimizations)
            return;
        this.insideRunScheduledOptimizations = true;

        for (index in this.scheduledOptimizations)
        {
            var id = this.scheduledOptimizations[index][0];
            var elem = document.getElementById(id);
            if (elem)
            {
                var info = this.scheduledOptimizations[index][1];
                this.scheduledOptimizations.splice(index, 1);

                // convert layers array from PROTO into JavaScript
                var layers = [];
                for (var i = 0; i < info.layers.length; i++)
                    layers.push(info.layers[i]);

                // load short xml3d
                var thus = this;
                $.ajax({
                    type: "GET",
                    url: xml3dMapServerBase + "sirikataconnect.php",
                    data: {action: "getxml3dshort", x: info.x, y: info.y, z: info.z, layers: layers},
                    success: function(data) {
                        // remove old data
                        $(elem).empty();

                        // patch ids that are not in defs
                        thus.appendSuffixToLocalIds(data.documentElement, id);

                        // append new scene
                        for (var node = data.documentElement.firstChild; node; node = node.nextSibling)
                            elem.appendChild(document.importNode(node, true));

                        // log
                        console.log("loaded tile " + id);
                    },
                    async: false,
                    dataType: "xml"
                })
            }
        }

        this.insideRunScheduledOptimizations = false;
    }

    // rename all ids in the element and all of it's children
    // by adding suffix to the end of the id
    VisComp.Behavior.Tile.prototype.appendSuffixToLocalIds = function(element, suffix) {
        // reference attribute database
        var refAttrDB = {
            "": ["id"], // for all elements
            "group": ["transform", "shader"],
            "mesh": ["src"],
            "light": ["shader"],
            "xml3d": ["activeView"],
            "animation": ["data"],
            "data": ["src"]
        };

        // reference css property database
        var refCSSPropDB = {
            "group": ["transform", "shader"]
        };

        var defsIds = this.defsIds;

        // function to rename reference attributes
        function fixAttrs(element, suffix, attrs) {
            for (var i in attrs)
                if (element.hasAttribute(attrs[i]))
                {
                    var id = element.getAttribute(attrs[i]);
                    if (id[0] == "#")
                        id = id.substring(1);

                    if (defsIds.indexOf(id) == -1)
                        element.setAttribute(attrs[i], element.getAttribute(attrs[i]) + suffix);
                }
        }

        // rename reference attributes common for all elements
        fixAttrs(element, suffix, refAttrDB[""]);

        // rename reference attributes specific to this element
        if (refAttrDB[element.nodeName.toLowerCase()] !== undefined)
            fixAttrs(element, suffix, refAttrDB[element.nodeName.toLowerCase()]);

        // function to rename reference CSS properties
        function fixCSSProps(element, suffix, attrs) {
            // no support for style in WebGL
            if (element.style == undefined)
                return;

            for (var i in attrs)
            {
                var value = element.style[attrs[i]];
                if (value !== undefined && value.length > 4 && value.substring(0, 4) == "url(")
                {
                    var id = value.substring(4, value.length - 1);
                    if (id[0] == "#")
                        id = id.substring(1);

                    if (defsIds.indexOf(id) == -1)
                        element.style[attrs[i]] = "url(" + value.substring(4, value.length - 1) + suffix + ")";
                }
            }
        }

        // rename reference CSS properties specific to this element
        if (refCSSPropDB[element.nodeName.toLowerCase()] !== undefined)
            fixCSSProps(element, suffix, refCSSPropDB[element.nodeName.toLowerCase()]);

        // special handling for "script" attribute, since it may contain URN reference
        // which must remain unchanged
        if (element.nodeName.toLowerCase() == "lightshader" ||
            element.nodeName.toLowerCase() == "shader" ||
            element.nodeName.toLowerCase() == "data")
            if (element.hasAttribute("script") && element.getAttribute("script").substring(0, 3) != "urn")
                fixAttrs(element, suffix, ["script"]);

        // process child elements recursively
        for (var childIndex in element.childNodes)
            if (element.childNodes[childIndex].nodeType == Node.ELEMENT_NODE)
                this.appendSuffixToLocalIds(element.childNodes[childIndex], suffix);
    }
    // END HACK!

}, '../../scripts/behavior/tile/Tile.js');

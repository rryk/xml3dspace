/*  KataSpace
 *  chat.js
 *
 *  Copyright (c) 2010, Ewen Cheslack-Postava
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
    'katajs/oh/GUISimulation.js'
], function() {

    var SUPER = Kata.GUISimulation.prototype;

    /** Create animation library to be assigned to the avatar. */
    AnimLibUI = function(channel, name, width) {
        SUPER.constructor.call(this, channel);

        this.initialized = false;
        this.createInterface([
            {value: "dataAnim1", name: 'Zombie'},
            {value: "dataAnim2", name: 'Walking'},
            {value: "dataAnim3", name: 'Waving'},
            {value: "dataAnim4", name: 'Jump-rope'}, 
            {value: "dataAnim5", name: 'Idle (Standing)'}
        ]);
    };
    Kata.extend(AnimLibUI, SUPER);

    AnimLibUI.prototype.createInterface = function(dataBlockNames, avatars)
    {
        var xml =
        "<div xmlns='http://www.w3.org/1999/xhtml' style='position: absolute; right: 25px; top: 40px; width: 205px; -webkit-box-shadow: rgba(0, 0, 0, 0.699219) 0px 0px 10px; padding: 5px; display: none; text-align: center; background: #555;'>" +
            "<b>Override animation</b><br/>" + 
            "<button style='position: absolute; top: 5px; right: 5px; border: 1px; cursor: pointer;' onclick='animlibui.hideInterface()'>X</button>" +
            "<style type='text/css'>.animLibDataBlock{border: 1px gray solid; margin: 2px; padding: 5px; cursor: pointer;}</style>" +
            "<div id='animLibDataBlocks' />" +
            "<label for='animLibName'>name:</label><input style='border: 1px; margin-left: 5px; width: 151px;' id='animLibName' /><br/>" +
            "<label for='animLibRepeat'>repeat</label><input checked='checked' type='checkbox' id='animLibRepeat' />" +
            "<label for='animLibStart'>from</label> <input id='animLibStart' style='border: 1px; width: 40px; margin-right: 5px;' />" +
            "<label for='animLibEnd'>to</label> <input id='animLibEnd' style='border: 1px; width: 40px' /><br/>" +
            "<input type='hidden' id='animLibMaxEnd' value='-1'/>" +
            "<button style='width: 100%; height: 25px;' onclick='animlibui.createAnimation()'>OK</button><br/>" +
          "</div>";

        var doc = $.parseXML(xml);
        this.root = document.importNode(doc.documentElement, true);

        document.getElementsByTagName('body')[0].appendChild(this.root);
        
        var dataBlocks = document.getElementById("animLibDataBlocks");
        for (var i = 0; i < dataBlockNames.length; i++)
        {
            var block = document.createElement("div");
            var value = dataBlockNames[i].value;
            var name = dataBlockNames[i].name;
            var tn = document.createTextNode(name);
            
            block.appendChild(tn);
            block.setAttribute('class', 'animLibDataBlock');
            block.setAttribute('id', 'animLib' + value);
            block.addEventListener('click', Kata.bind(this.onDataBlockClick, this, value));

            $('#animLibDataBlocks').append(block);
        }

        $(window).resize(Kata.bind(this.updateOnResize, this));
        this.updateOnResize();
    }

    AnimLibUI.prototype.updateOnResize = function() {
        var bodyWidth = $('body').width();
        if (bodyWidth > 1359)
        {
            this.root.style.right = '10px';
            this.root.style.top = '38px';
        }
        else
        {
            this.root.style.right = Math.max((bodyWidth - 904) / 2 + 13, 3) + "px";
            this.root.style.top = '40px';
        }
    }

    AnimLibUI.prototype.showInterface = function(avatarID) {
        this.root.style.display = "block";
        this.avatarID = avatarID;
    }

    AnimLibUI.prototype.hideInterface = function() {
        this.root.style.display = "none";
    }

    AnimLibUI.prototype.onDataBlockMouseDown = function(dataBlock) {
        $('body').css("cursor: move");
    }

    AnimLibUI.prototype.onDataBlockMouseMove = function(dataBlock) {
    }

    AnimLibUI.prototype.onDataBlockClick = function(dataBlock) {
        // remove selection from the previous element
        if (this.dataBlockID != undefined)
            $('#animLib' + this.dataBlockID).css('background', 'transparent');
        
        // mark new element as selectd
        this.dataBlockID = dataBlock;
        $('#animLib' + this.dataBlockID).css('background-color', '#999');

        var dataId = this.dataBlockID + this.avatarID;
        var animNode = document.getElementById(dataId);
        if (animNode)
        {
            var len = 0;
            for (var i = 0; i < animNode.childNodes.length; i++)
            {
                var child = animNode.childNodes[i];
                if (child.nodeType == Node.ELEMENT_NODE && 
                    child.nodeName.toLowerCase() == "float4x4" &&
                    child.getAttribute("name").substring(0, 9) == "transform" &&
                    child.getAttribute("name").length > 9)
                {
                    len++;
                }
            }

            document.getElementById('animLibStart').value = 0;
            document.getElementById('animLibEnd').value = len-1;
            document.getElementById('animLibMaxEnd').value = len-1;
        }
        else
        {
            document.getElementById('animLibStart').value = '';
            document.getElementById('animLibEnd').value = '';
            document.getElementById('animLibMaxEnd').value = '-1';
        }
    }

    AnimLibUI.prototype.createAnimation = function() {
        var data = this.dataBlockID;
        var name = document.getElementById('animLibName').value;
        var start = parseInt(document.getElementById('animLibStart').value);
        var end = parseInt(document.getElementById('animLibEnd').value);
        var repeat = document.getElementById('animLibRepeat').checked;
        var maxEnd = document.getElementById('animLibMaxEnd').value;

        if (data == '') {alert("Please select data block"); return; }
        if (name == '') {alert("Please select name for animation"); return; }
        if (document.getElementById('animLibStart').value == '') {alert("Starting frame cannot be empty"); return; }
        if (document.getElementById('animLibEnd').value == '') {alert("Ending frame cannot be empty"); return; }
        if (start < 0) {alert("Starting frame must be positive"); return; }
        if (end > maxEnd) {alert("Ending frame cannot be larger than total frames (" + maxEnd + ")"); return; }
        if (end < start) {alert("Starting frame cannot be larger than ending"); return; }

        this.mChannel.sendMessage(
            new Kata.ScriptProtocol.ToScript.GUIMessage(
                {
                    msg: "createanim",
                    data: data,
                    name: name,
                    offset: start,
                    len: end - start + 1,
                    repeat: repeat
                }
            )
        );
    }

    // GUISimulation interface
    AnimLibUI.prototype.handleGUIMessage = function(evt) {
        var revt = evt.event;

        // TODO: handle messages from the system (e.g. avatar loaded)
    };

});

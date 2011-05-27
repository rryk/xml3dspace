Kata.require([
    'katajs/oh/GUISimulation.js',
    kata_base_offset + "scripts/Tools.js"
], function() {

    var SUPER = Kata.GUISimulation.prototype;
    
    /** 
     * Constructs radar UI that displays objects in the world. Interface
     * is created within a parent element.
     *
     * @param channel Channel to the system.
     * @param container Parent container element.
     */
    DisplayUI = function(channel, container, worldBounds, scale) {
        SUPER.constructor.call(this, channel);
        
        // create SVG container
        this.scale = scale ? scale : 30;
        this.containerWidth = (worldBounds[1] - worldBounds[0]) * this.scale;
        this.containerHeight = (worldBounds[5] - worldBounds[4]) * this.scale;
        this.svgContainer = $("<svg class='radar' xmlns='http://www.w3.org/2000/svg'></svg>");
        this.svgContainer.attr("width", this.containerWidth);
        this.svgContainer.attr("height", this.containerHeight);
        $(container).append(this.svgContainer);
        
        // initialize object list
        this.objects = {};
        
        // save world bounds
        this.worldBounds = worldBounds;
    }
    Kata.extend(DisplayUI, SUPER);
    
    /**
     * Create an object on display.
     *
     * @param id New object ID.
     * @param type Type of object. Defines appearance.
     * @param size Minimum circle radius required to inscribe object into it.
     */
    DisplayUI.prototype.create = function(id, type, size, name) {
        if (this.objects[id]) {
            Kata.warn("Tried to create new object with same ID.");
            return;
        }
        
        // create SVG object
        if (type == "lemming") {
           var svgObj = document.createElementNS("http://www.w3.org/2000/svg", "circle");
           var radius = size * this.scale; // map size to radius
           svgObj.setAttribute("r", size * this.scale);
           svgObj.setAttribute("class", "lemming");
           svgObj.setAttribute("title", name);
           svgObj.style.display = "none";
           svgObj.setPosition = function(x, y) {
               svgObj.setAttribute("cx", x);
               svgObj.setAttribute("cy", y);
               svgObj.style.display = "";
           }
        } else if (type == "box") {
           var svgObj = document.createElementNS("http://www.w3.org/2000/svg", "rect");
           var sideLen = size * this.scale * Math.sqrt(2); // compute side length of the box inscribed into a circle with radius = size
           svgObj.setAttribute("width", sideLen);
           svgObj.setAttribute("height", sideLen);
           svgObj.setAttribute("class", "box");
           svgObj.style.display = "none";
           svgObj.setPosition = function(x, y) {
               svgObj.setAttribute("x", x - sideLen / 2);
               svgObj.setAttribute("y", y - sideLen / 2);
               svgObj.style.display = "";
           }
        }
        
        // append SVG object to the DOM
        this.svgContainer.append(svgObj);
        
        // save SVG object in the list
        this.objects[id] = svgObj;
    }
    
    /** Moves previously created object to a new position */
    DisplayUI.prototype.move = function(id, pos) {
        if (!this.objects[id]) {
            Kata.warn("Tried to move object that does not exist");
            return;
        }
        
        // map position to the canvas
        var x = this.containerWidth * (pos[0] - this.worldBounds[0]) / (this.worldBounds[1] - this.worldBounds[0]);
        var y = this.containerHeight * ((-pos[2]) - this.worldBounds[4]) / (this.worldBounds[5] - this.worldBounds[4]);
        
        // move the object
        this.objects[id].setPosition(x, y);
    }
    
    /** Deletes previously created object */
    DisplayUI.prototype.delete = function(id) {
        if (!this.objects[id]) {
            Kata.warn("Tried to delete object that does not exist");
            return;
        }
        
        // delete the object
        $(this.objects[id]).remove();
        delete this.objects[id];
    }
    
    /** 
     * Handles messages from the system.
     *
     * @param msg Kata.ScriptProtocol.FromScript.GUIMessage message.
     */
    DisplayUI.prototype.handleGUIMessage = function(msg) {
        if (msg.msg == "display")
        {
            if (msg.event.action == "create")
                this.create(msg.event.id, msg.event.type, msg.event.size, msg.event.name);
            else if (msg.event.action == "move")
                this.move(msg.event.id, msg.event.pos);
            else if (msg.event.action = "delete")
                this.delete(msg.event.id);
        }
    }
    
}, kata_base_offset + 'scripts/ui/DisplayUI.js');
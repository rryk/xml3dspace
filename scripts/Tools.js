if (typeof(VisComp) === "undefined") VisComp = {};

Kata.require([
    'katajs/core/Location.js',
], function() {

    var EPS = 0.00001;

    // compares real numbers, returns true if equal, false otherwise
    VisComp.compareReal = function(value1, value2) {
        return Math.abs(value1 - value2) < EPS;
    }

    VisComp.distance = function(a, b) {
        return Math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) + (a[2]-b[2])*(a[2]-b[2]));
    }

}, kata_base_offset + "scripts/LemmingTools.js");
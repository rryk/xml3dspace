if (typeof(FIContent) === "undefined") FIContent = {};

Kata.require([
    'katajs/core/Location.js',
], function() {

    var EPS = 0.00001;

    // compares real numbers, returns true if equal, false otherwise
    FIContent.compareReal = function(value1, value2) {
        return Math.abs(value1 - value2) < EPS;
    }

}, kata_base_offset + "scripts/LemmingTools.js");
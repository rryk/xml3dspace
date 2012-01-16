// space server
//var spaceServer = "sirikata://" + window.location.host + ":7777/";
//var spaceServer = "sirikata://yellow.cg.uni-saarland.de:7777/";
//var spaceServer = "sirikata://192.168.141.132:7777/";
var spaceServer = "loop://localhost:7777/";

// meshes
var boxMesh = "cdn/box.xml3d";
var emptyMesh = "cdn/empty.xml3d";
var simpleWorldMesh = "cdn/simpleWorld.xml3d";

// base offset
var kata_base_offset = "../../"; // offset from the externals/katajs/ back to the root dir

// web workers
Kata.WEB_WORKERS_ENABLED = false;
//Kata.bootstrapWorker = window.location.href + "/boostrapWorker.js";
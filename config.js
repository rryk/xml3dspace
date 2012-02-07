// space server
//var spaceServer = "sirikata://" + window.location.host + ":7777/";
//var spaceServer = "sirikata://yellow.cg.uni-saarland.de:7777/";
spaceServer = "sirikata://192.168.141.132:7777/";
//var spaceServer = "loop://localhost:7777/";

// meshes
emptyMesh = "cdn/empty.xml3d";

// base offset
kata_base_offset = "../../"; // offset from the externals/katajs/ back to the root dir

// web workers
Kata.WEB_WORKERS_ENABLED = false;
//Kata.bootstrapWorker = window.location.href + "/boostrapWorker.js";

// root for the XML3DMapServer
xml3dMapServerBase = "http://localhost/devenv3/citygml-xml3d/xml3d-gis_current/httpdocs/";
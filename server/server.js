var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

console.log('Server started on 12626');

var playerPos = {x:0, y:0};
var rooms = {};
var waitingPlayers = [];

function wsBroadCast(cmd, data) {
    for(var i in wss.clients) {
        wss.clients[i].send(JSON.stringify({"cmd": cmd, "data":data}));
    }
}

function controllerSyncPos(data) {
    playerPos.x = data.x;
    playerPos.y = data.y;
    wsBroadCast("syncPos", playerPos);
}

function controllerInit(data) {
    var random_seed = Math.floor(Math.random() * 1000 + 1);
    var global = {"random_seed": random_seed};
    wsBroadCast("init", global);
}

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        var msg = JSON.parse(message);
        var cmd = msg["cmd"];
        var data = msg["data"];
        var resp;
        switch(cmd) {
            case "init":
                resp = controllerInit(data);
                break;
            case "syncPos":
                resp = controllerSyncPos(data);
                break;
        }
        console.log('msg: ' + cmd);
    });
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify(playerPos));
    });
    console.log('connection');
});

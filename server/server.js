var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

console.log('Server started on 12626');

var playerPos = {x:0, y:0};

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

function controllerGetGlobal(data) {
    var global = {"random_seed": 5};
    wsBroadCast("getGlobal", global);
}

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        var msg = JSON.parse(message);
        var cmd = msg["cmd"];
        var data = msg["data"];
        var resp;
        console.log('msg: ' + cmd);
        switch(cmd) {
            case "syncPos":
                resp = controllerSyncPos(data);
                break;
            case "getGlobal":
                resp = controllerGetGlobal(data);
                break;
        }
        console.log('msg: ' + cmd);
    });
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify(playerPos));
    });
    //ws.send(JSON.stringify(playerPos));
    console.log('connection');
});

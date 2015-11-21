var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

console.log('Server started on 12626');

var
rabbit = {x:0, y:0};

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        var incommingMsg = JSON.parse(message);
        rabbit.x = incommingMsg.x;
        rabbit.y = incommingMsg.y;
        for(var i in wss.clients) {
            wss.clients[i].send(JSON.stringify(rabbit));
        }
        console.log('message');
    });
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify(rabbit));
    });
    //ws.send(JSON.stringify(rabbit));
    console.log('connection');
});

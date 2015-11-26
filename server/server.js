var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

//uuid
var uuid = require('node-uuid');

console.log('Server started on 12626');

var playerPos = {x:0, y:0};
var rooms = {};

//玩家类
function player(ws){
    this.uuid = uuid.v4();
    this.ws = ws;
}

//创建玩家
function createPlayer(ws) {
    return new player(ws);
}

//玩家等待队列对象
function waitingPlayers() {
    this.players = [];
}

//循环方法扫描等待玩家
waitingPlayers.prototype.scanWaiterToCreateRoom = function() {
    console.log('scaning.....' + this.players.length);
    //判断当前等待用户是否多余一个
    if (this.players.length > 1) {

        //获取玩家数据，创建房间，通知玩家加入房间
        //获取一号玩家
        playerOne = this.players.shift();
        //获取二号玩家
        playerTwo = this.players.shift();

        //创建房间
        room = createRoom();
        //房间加入房间列表
        rooms[room.urid] = room;
        //一号玩家加入房间
        room.playerOne = playerOne;
        //二号玩家加入房间
        room.playerTwo = playerTwo;

        //通知玩家加入房间
        this.notifyPlayerJoinRoom(room);
        //继续等待玩家
        this.scanWaiterToCreateRoom();
    } else {
        //延时扫描等待玩家
        var _this = this;
        setTimeout(function(){_this.scanWaiterToCreateRoom()}, 5000);
    }
}

//通知玩家加入房间
waitingPlayers.prototype.notifyPlayerJoinRoom = function(room) {
    //通知一号玩家加入房间
    room.playerOne.ws.send('something');
    //通知二号玩家加入房间
    room.playerTwo.ws.send('something');
}

//玩家加入等待队列
waitingPlayers.prototype.playerJoinWaiting = function(player) {
    //通知一号玩家加入房间
    this.players.push(player)
}


//房间类
function room() {
    //房间id
    this.urid = uuid.v4();
    //一号玩家，左边
    this.playerOne = null;
    //二号玩家，右边
    this.playerTwo = null;
}


//创建房间
function createRoom() {
    return new room();
}

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


//创建队列
var wp = new waitingPlayers();
//开始扫描队列
wp.scanWaiterToCreateRoom()

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        var msg = JSON.parse(message);
        var cmd = msg["cmd"];
        var data = msg["data"];
        var resp;
        switch(cmd) {
            case "init":
                //初始化时，创建玩家
                var player = createPlayer(ws);
                //玩家加入等待队列
                wp.playerJoinWaiting(player);

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

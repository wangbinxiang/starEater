var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

var uuid = require('node-uuid');
console.log('Server started on 12626');

var rooms = {};
var players = {};

//玩家类
function player(ws){
    this.uuid = uuid.v4();
    this.ws = ws;
    this.roomId = null;
}

//创建玩家
function createPlayer(ws) {
    var p = new player(ws);
    players[p.uuid] = p;
    return p;
}

player.prototype.send = function(cmd, data) {
    var data = {"cmd": cmd, "pid":this.uuid, "data":data};
    this.ws.send(JSON.stringify(data));
    console.log(data);
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
        playerOne = this.players.pop();
        //获取二号玩家
        playerTwo = this.players.pop();

        //创建房间
        var room = createRoom();
        //房间加入房间列表
        rooms[room.urid] = room;
        //一号玩家加入房间
        room.playerOne = playerOne;
        room.playerOne.roomId = room.urid;
        //二号玩家加入房间
        room.playerTwo = playerTwo;
        room.playerTwo.roomId = room.urid;

        //通知玩家加入房间
        this.notifyPlayerJoinRoom(room);
        //继续等待玩家
        this.scanWaiterToCreateRoom();
    } else {
        //延时扫描等待玩家
        var _this = this;
        setTimeout(function(){_this.scanWaiterToCreateRoom()}, 1000);
    }
}

waitingPlayers.prototype.notifyPlayerJoinRoom = function(room) {
    var playerOneData = {
        "randomSeed": room.randomSeed, 
        "roomId": room.urid, 
        "playerOneId": room.playerOne.uuid, 
        "playerTwoId": room.playerTwo.uuid,
        "yourRoleId": room.playerOne.uuid
    };
    var playerTwoData = {
        "randomSeed": room.randomSeed, 
        "roomId": room.urid, 
        "playerOneId": room.playerOne.uuid, 
        "playerTwoId": room.playerTwo.uuid,
        "yourRoleId": room.playerTwo.uuid
    };
    room.playerOne.send("init", playerOneData)
    room.playerTwo.send("init", playerTwoData)
}

waitingPlayers.prototype.playerJoinWaiting = function(player) {
    this.players.push(player)
}


//房间类
function room() {
    this.urid = uuid.v4();
    this.randomSeed = Math.floor(Math.random() * 1000 + 1);
    this.playerOne = null;
    this.playerTwo = null;
}

room.prototype.broadCast = function(cmd, data) {
    this.playerOne.send(cmd, data);
    this.playerTwo.send(cmd, data);
}

function createRoom() {
    return new room();
}

function controllerSyncPos(ws, playerId, positionData) {
    var roomId = players[playerId].roomId;
    var room = rooms[roomId];
    var data = {"playerId": playerId, "pos": positionData};
    room.broadCast("syncPos", data);
}

function controllerInit(ws) {
    var player = createPlayer(ws);
    wp.playerJoinWaiting(player);
}


//创建队列
var wp = new waitingPlayers();
//开始扫描队列
wp.scanWaiterToCreateRoom()

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        var msg = JSON.parse(message);
        var cmd = msg["cmd"];
        var playerId = msg["pid"];
        var data = msg["data"];
        var resp;
        switch(cmd) {
            case "init":
                resp = controllerInit(ws);
                break;
            case "syncPos":
                resp = controllerSyncPos(ws, playerId, data);
                break;
        }
        console.log('msg: ' + cmd + ', playerId: ' + playerId);
        console.log(data);
    });
    console.log('connection');
});

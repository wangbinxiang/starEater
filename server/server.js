var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

var uuid = require('node-uuid');
console.log('Server started on 12626');

var rooms = {};
var players = {};
var connections = {};

function room() {
    this.uuid = uuid.v4();
    this.randomSeed = Math.floor(Math.random() * 1000 + 1);
    this.monsters = {}
    this.playerOne = null;
    this.playerTwo = null;
}

function createRoom() {
    var r = new room();
    var starCount = 11;
    var starType = "star";
    for (var i=0;i<starCount;i++) {
        var m = createMonster(starType);
        r.monsters[m.uuid] = m;
    }
    return r;
}

room.prototype.broadCast = function(cmd, data) {
    this.playerOne.send(cmd, data);
    this.playerTwo.send(cmd, data);
}

function player(){
    this.uuid = uuid.v4();
    this.roomId = null;
}

function createPlayer(ws) {
    var p = new player();
    players[p.uuid] = p;
    connections[p.uuid] = ws;
    return p;
}

player.prototype.send = function(cmd, data) {
    var data = {"cmd": cmd, "pid":this.uuid, "data":data};
    console.log(data);
    var connection = connections[this.uuid];
    connection.send(JSON.stringify(data));
}

function monster(type){
    this.uuid = uuid.v4();
    this.type = type;
    this.killed = false;
}

function createMonster(type) {
    var m = new monster(type);
    return m;
}

function waitingPlayers() {
    this.players = [];
}

waitingPlayers.prototype.scanWaiterToCreateRoom = function() {
    console.log('scaning.....' + this.players.length);
    if (this.players.length > 1) {
        var room = createRoom();
        rooms[room.uuid] = room;

        var playerOne = this.players.pop();
        var playerTwo = this.players.pop();
        playerOne.roomId = room.uuid;
        playerTwo.roomId = room.uuid;
        room.playerOne = playerOne;
        room.playerTwo = playerTwo;

        this.notifyPlayerJoinRoom(room);
        this.scanWaiterToCreateRoom();
    } else {
        var _this = this;
        setTimeout(function(){_this.scanWaiterToCreateRoom()}, 1000);
    }
}

waitingPlayers.prototype.notifyPlayerJoinRoom = function(room) {
    console.log(room);
    var playerOneData = {
        "room": room,
        //"uuid": room.uuid,
        //"randomSeed": room.randomSeed,
        //"monsters": room.monsters,
        //"playerOne": room.playerOne,
        //"playerTwo": room.playerTwo,
        "yourRoleId": room.playerOne.uuid
    };
    var playerTwoData = {
        "room": room,
        "yourRoleId": room.playerTwo.uuid
    };
    room.playerOne.send("init", playerOneData)
    room.playerTwo.send("init", playerTwoData)
}

waitingPlayers.prototype.playerJoinWaiting = function(player) {
    this.players.push(player)
}


function controllerSyncPos(ws, playerId, positionData) {
    console.log(playerId);
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

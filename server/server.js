var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 12626});

var uuid = require('node-uuid');
console.log('Server started on 12626');

var WORLD_WIDTH = 800;
var WORLD_HEIGHT = 600;
var PLAYER_WIDTH = 32;
var PLAYER_HEIGHT = 48;
var STAR_WIDTH = 24;
var STAR_HEIGHT = 22;

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
        var x = Math.floor( WORLD_WIDTH/starCount*i + WORLD_WIDTH/starCount/2 - STAR_WIDTH/2);
        var y = 0;
        var m = createMonster(starType, x, y);
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
    this.roomID = null;
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

function monster(type, x, y){
    this.uuid = uuid.v4();
    this.type = type;
    this.killed = false;
    this.x = x;
    this.y = y;
}

function createMonster(type, x, y) {
    var m = new monster(type, x, y);
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
        playerOne.roomID = room.uuid;
        playerTwo.roomID = room.uuid;
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
        "yourRoleID": room.playerOne.uuid
    };
    var playerTwoData = {
        "room": room,
        "yourRoleID": room.playerTwo.uuid
    };
    room.playerOne.send("init", playerOneData)
    room.playerTwo.send("init", playerTwoData)
}

waitingPlayers.prototype.playerJoinWaiting = function(player) {
    this.players.push(player)
}


function controllerSyncPos(ws, playerID, positionData) {
    console.log(playerID);
    if(!playerID) {
        ws.close();
        return;
    }
    var roomID = players[playerID].roomID;
    var room = rooms[roomID];
    var data = {"playerID": playerID, "pos": positionData};
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
        var playerID = msg["pid"];
        var data = msg["data"];
        var resp;
        switch(cmd) {
            case "init":
                resp = controllerInit(ws);
                break;
            case "syncPos":
                resp = controllerSyncPos(ws, playerID, data);
                break;
        }
        console.log('msg: ' + cmd + ', playerID: ' + playerID);
        console.log(data);
    });
    console.log('connection');
});

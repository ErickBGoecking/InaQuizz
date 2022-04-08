//Dependencias
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');


//Classes importadas
const { LiveGames } = require('./utils/liveGames');

const publicPath = path.join(__dirname, '../public');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var games = new LiveGames();


//Mongodb setup
var MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var url = "mongodb://localhost:27017/";

app.use(express.static(publicPath));

//Servidor inicial na porta 3000
server.listen(3000, () => {
    console.log("Server started on port 3000");
});

//Quando uma conexão com o servidor é feita a partir do cliente
io.on('connection', (socket) => {

    //Quando o host se conecta pela primeira vez
    socket.on('host-join', (data) => {

        //Verifique se o id passou em url corresponde ao id do jogo kahoot no banco de dados
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("inGameDB");
            var query = { id: parseInt(data.id) };
            dbo.collection('inatelGames').find(query).toArray(function (err, result) {
                if (err) throw err;

                //Um kahoot foi encontrado com o id passado em url
                if (result[0] !== undefined) {
                    var gamePin = Math.floor(Math.random() * 90000) + 10000; //novo pin para o jogo

                    games.addGame(gamePin, socket.id, false, { playersAnswered: 0, questionLive: false, gameid: data.id, question: 1 }); //Cria um jogo com pin e id de host

                    var game = games.getGame(socket.id); //Gets the game data

                    socket.join(game.pin);//O anfitrião está se juntando a uma sala baseada no pin

                    console.log('Game Created with pin:', game.pin);

                    //Envio de pino de jogo para hospedar para que eles possam exibi-lo para os jogadores para participar
                    socket.emit('showGamePin', {
                        pin: game.pin
                    });
                } else {
                    socket.emit('noGameFound');
                }
                db.close();
            });
        });

    });

});


//Dependencias
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');


//Classes importadas
const { LiveGames } = require('./utils/liveGames');
const { Players } = require('./utils/players');

const publicPath = path.join(__dirname, '../public');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var games = new LiveGames();
var players = new Players();


//Mongodb setup
var MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var url = "mongodb+srv://root:root@cluster0.7oqtx.mongodb.net/Cluster0?retryWrites=true&w=majority";

app.use(express.static(publicPath));

//Servidor inicial na porta 3000
server.listen(3000, () => {
    console.log("Server started on port 3000");
});

//Quando uma conexão com o servidor é feita a partir do cliente
io.on('connection', (socket) => {

    //Quando o host se conecta pela primeira vez
    socket.on('host-join', (data) => {

        //Verifique se o id passou em url corresponde ao id do jogo inGame no banco de dados
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("inGameDB");
            var query = { id: parseInt(data.id) };
            dbo.collection('inatelGames').find(query).toArray(function (err, result) {
                if (err) throw err;

                //Um jogo foi encontrado com o id passado em url
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

    //Quando o host se conecta a partir da exibição do jogo
    socket.on('host-join-game', (data) => {
        var oldHostId = data.id;
        var game = games.getGame(oldHostId);//Começa jogo com antigo host id
        if (game) {
            game.hostId = socket.id;//Altera a id do host do jogo para nova id de host
            socket.join(game.pin);
            var playerData = players.getPlayers(oldHostId);//Recebe jogador no jogo
            for (var i = 0; i < Object.keys(players.players).length; i++) {
                if (players.players[i].hostId == oldHostId) {
                    players.players[i].hostId = socket.id;
                }
            }
            var gameid = game.gameData['gameid'];
            MongoClient.connect(url, function (err, db) {
                if (err) throw err;

                var dbo = db.db('inGameDB');
                var query = { id: parseInt(gameid) };
                dbo.collection("inatelGames").find(query).toArray(function (err, res) {
                    if (err) throw err;

                    var question = res[0].questions[0].question;
                    var answer1 = res[0].questions[0].answers[0];
                    var answer2 = res[0].questions[0].answers[1];
                    var answer3 = res[0].questions[0].answers[2];
                    var answer4 = res[0].questions[0].answers[3];
                    var correctAnswer = res[0].questions[0].correct;

                    socket.emit('gameQuestions', {
                        q1: question,
                        a1: answer1,
                        a2: answer2,
                        a3: answer3,
                        a4: answer4,
                        correct: correctAnswer,
                        playersInGame: playerData.length
                    });
                    db.close();
                });
            });


            io.to(game.pin).emit('gameStartedPlayer');
            game.gameData.questionLive = true;
        } else {
            socket.emit('noGameFound');//Nenhum jogo foi encontrado, redirecionar usuário
        }
    });

    //Quando o jogador se conecta pela primeira vez
    socket.on('player-join', (params) => {

        var gameFound = false; //Se um jogo for encontrado com pin fornecido pelo jogador

        //Para cada jogo na classe Jogos
        for (var i = 0; i < games.games.length; i++) {
            //Se o pin é igual a um dos pinos do jogo
            if (params.pin == games.games[i].pin) {

                console.log('Player connected to game');

                var hostId = games.games[i].hostId; //Obtenha a id de host do jogo


                players.addPlayer(hostId, socket.id, params.name, { score: 0, answer: 0 }); //adicionar jogador ao jogo

                socket.join(params.pin); //Jogador está juntando sala com baseado no pin

                var playersInGame = players.getPlayers(hostId); //Colocando todos os jogadores no jogo

                io.to(params.pin).emit('updatePlayerLobby', playersInGame);//Enviando dados do host player para exibir
                gameFound = true; //O jogo foi encontrado
            }
        }

        //Se o jogo não foi encontrado
        if (gameFound == false) {
            socket.emit('noGameFound'); //Jogador é enviado de volta para 'juntar' página porque jogo não foi encontrado com o pin
        }


    });

    //Quando o jogador se conecta a partir da view do jogo
    socket.on('player-join-game', (data) => {
        var player = players.getPlayer(data.id);
        if (player) {
            var game = games.getGame(player.hostId);
            socket.join(game.pin);
            player.playerId = socket.id;//Atualizar o id do jogador com id de soquete

            var playerData = players.getPlayers(game.hostId);
            socket.emit('playerGameData', playerData);
        } else {
            socket.emit('noGameFound');//Nenhum jogador encontrado
        }

    });

    //Quando um host ou jogador deixa o site
    socket.on('disconnect', () => {
        var game = games.getGame(socket.id); //Encontrar jogo com socket.id
        //Se um jogo hospedado por esse id for encontrado, o soquete desconectado é um host
        if (game) {
            //Verificando se o host foi desligado ou foi enviado para a exibição do jogo
            if (game.gameLive == false) {
                games.removeGame(socket.id);//Remova o jogo da classe de jogos
                console.log('Game ended with pin:', game.pin);

                var playersToRemove = players.getPlayers(game.hostId); //Recebendo todos os jogadores no jogo

                //Para cada jogador do jogo
                for (var i = 0; i < playersToRemove.length; i++) {
                    players.removePlayer(playersToRemove[i].playerId); //Removendo cada jogador da classe de jogadores
                }

                io.to(game.pin).emit('hostDisconnect'); //Enviar jogador de volta para a tela 'join'
                socket.leave(game.pin); //Socket está deixando espaço
            }
        } else {
            //Nenhum jogo foi encontrado, então é um socket de jogador que se desconectou
            var player = players.getPlayer(socket.id); //Conseguir jogador com socket.id
            //Se um jogador foi encontrado com essa id
            if (player) {
                var hostId = player.hostId;//Fica id de host do jogo
                var game = games.getGame(hostId);//Obtém dados do jogo com hostId
                var pin = game.pin;//Recebe o pin do jogo

                if (game.gameLive == false) {
                    players.removePlayer(socket.id);//Remove jogador da classe players
                    var playersInGame = players.getPlayers(hostId);//Recebe jogadores restantes no jogo

                    io.to(pin).emit('updatePlayerLobby', playersInGame);//Envia dados para host para atualizar tela
                    socket.leave(pin); //Jogador está saindo da sala

                }
            }
        }

    });

    //Define dados na classe do jogador para responder do jogador
    socket.on('playerAnswer', function (num) {
        var player = players.getPlayer(socket.id);
        var hostId = player.hostId;
        var playerNum = players.getPlayers(hostId);
        var game = games.getGame(hostId);
        if (game.gameData.questionLive == true) {//se a questão ainda está ao vivo
            player.gameData.answer = num;
            game.gameData.playersAnswered += 1;

            var gameQuestion = game.gameData.question;
            var gameid = game.gameData.gameid;

            MongoClient.connect(url, function (err, db) {
                if (err) throw err;

                var dbo = db.db('inGameDB');
                var query = { id: parseInt(gameid) };
                dbo.collection("inatelGames").find(query).toArray(function (err, res) {
                    if (err) throw err;
                    var correctAnswer = res[0].questions[gameQuestion - 1].correct;
                    //Verifica a resposta do jogador com a resposta correta
                    if (num == correctAnswer) {
                        player.gameData.score += 100;
                        io.to(game.pin).emit('getTime', socket.id);
                        socket.emit('answerResult', true);
                    }

                    //Verifica se todos os jogadores responderam
                    if (game.gameData.playersAnswered == playerNum.length) {
                        game.gameData.questionLive = false; //Pergunta foi encerrada bc jogadores todos respondidos sob o tempo
                        var playerData = players.getPlayers(game.hostId);
                        io.to(game.pin).emit('questionOver', playerData, correctAnswer);//Diga a todos que a pergunta acabou
                    } else {
                        //atualizar a tela do host dos jogadores num respondeu
                        io.to(game.pin).emit('updatePlayersAnswered', {
                            playersInGame: playerNum.length,
                            playersAnswered: game.gameData.playersAnswered
                        });
                    }

                    db.close();
                });
            });



        }
    });

    socket.on('getScore', function () {
        var player = players.getPlayer(socket.id);
        socket.emit('newScore', player.gameData.score);
    });

    socket.on('time', function (data) {
        var time = data.time / 20;
        time = time * 100;
        var playerid = data.player;
        var player = players.getPlayer(playerid);
        player.gameData.score += time;
    });



    socket.on('timeUp', function () {
        var game = games.getGame(socket.id);
        game.gameData.questionLive = false;
        var playerData = players.getPlayers(game.hostId);

        var gameQuestion = game.gameData.question;
        var gameid = game.gameData.gameid;

        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var dbo = db.db('inGameDB');
            var query = { id: parseInt(gameid) };
            dbo.collection("inatelGames").find(query).toArray(function (err, res) {
                if (err) throw err;
                var correctAnswer = res[0].questions[gameQuestion - 1].correct;
                io.to(game.pin).emit('questionOver', playerData, correctAnswer);

                db.close();
            });
        });
    });

    socket.on('nextQuestion', function () {
        var playerData = players.getPlayers(socket.id);
        //Redefinir a resposta atual dos jogadores para 0
        for (var i = 0; i < Object.keys(players.players).length; i++) {
            if (players.players[i].hostId == socket.id) {
                players.players[i].gameData.answer = 0;
            }
        }

        var game = games.getGame(socket.id);
        game.gameData.playersAnswered = 0;
        game.gameData.questionLive = true;
        game.gameData.question += 1;
        var gameid = game.gameData.gameid;



        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var dbo = db.db('inGameDB');
            var query = { id: parseInt(gameid) };
            dbo.collection("inatelGames").find(query).toArray(function (err, res) {
                if (err) throw err;

                if (res[0].questions.length >= game.gameData.question) {
                    var questionNum = game.gameData.question;
                    questionNum = questionNum - 1;
                    var question = res[0].questions[questionNum].question;
                    var answer1 = res[0].questions[questionNum].answers[0];
                    var answer2 = res[0].questions[questionNum].answers[1];
                    var answer3 = res[0].questions[questionNum].answers[2];
                    var answer4 = res[0].questions[questionNum].answers[3];
                    var correctAnswer = res[0].questions[questionNum].correct;

                    socket.emit('gameQuestions', {
                        q1: question,
                        a1: answer1,
                        a2: answer2,
                        a3: answer3,
                        a4: answer4,
                        correct: correctAnswer,
                        playersInGame: playerData.length
                    });
                    db.close();
                } else {
                    var playersInGame = players.getPlayers(game.hostId);
                    var first = { name: "", score: 0 };
                    var second = { name: "", score: 0 };
                    var third = { name: "", score: 0 };
                    var fourth = { name: "", score: 0 };
                    var fifth = { name: "", score: 0 };

                    for (var i = 0; i < playersInGame.length; i++) {
                        console.log(playersInGame[i].gameData.score);
                        if (playersInGame[i].gameData.score > fifth.score) {
                            if (playersInGame[i].gameData.score > fourth.score) {
                                if (playersInGame[i].gameData.score > third.score) {
                                    if (playersInGame[i].gameData.score > second.score) {
                                        if (playersInGame[i].gameData.score > first.score) {
                                            //Primeiro Lugar
                                            fifth.name = fourth.name;
                                            fifth.score = fourth.score;

                                            fourth.name = third.name;
                                            fourth.score = third.score;

                                            third.name = second.name;
                                            third.score = second.score;

                                            second.name = first.name;
                                            second.score = first.score;

                                            first.name = playersInGame[i].name;
                                            first.score = playersInGame[i].gameData.score;
                                        } else {
                                            //Segundo Lugar
                                            fifth.name = fourth.name;
                                            fifth.score = fourth.score;

                                            fourth.name = third.name;
                                            fourth.score = third.score;

                                            third.name = second.name;
                                            third.score = second.score;

                                            second.name = playersInGame[i].name;
                                            second.score = playersInGame[i].gameData.score;
                                        }
                                    } else {
                                        //Terceiro lugar
                                        fifth.name = fourth.name;
                                        fifth.score = fourth.score;

                                        fourth.name = third.name;
                                        fourth.score = third.score;

                                        third.name = playersInGame[i].name;
                                        third.score = playersInGame[i].gameData.score;
                                    }
                                } else {
                                    //Quarto lugar
                                    fifth.name = fourth.name;
                                    fifth.score = fourth.score;

                                    fourth.name = playersInGame[i].name;
                                    fourth.score = playersInGame[i].gameData.score;
                                }
                            } else {
                                //Quinto lugar
                                fifth.name = playersInGame[i].name;
                                fifth.score = playersInGame[i].gameData.score;
                            }
                        }
                    }

                    io.to(game.pin).emit('GameOver', {
                        num1: first.name,
                        num2: second.name,
                        num3: third.name,
                        num4: fourth.name,
                        num5: fifth.name
                    });
                }
            });
        });

        io.to(game.pin).emit('nextQuestionPlayer');
    });

    //Quando o host começa o jogo
    socket.on('startGame', () => {
        var game = games.getGame(socket.id);//Obter o jogo com base em socket.id
        game.gameLive = true;
        socket.emit('gameStarted', game.hostId);//Diga ao jogador e host que o jogo começou
    });

    //Dar dados de nomes de jogos de usuário
    socket.on('requestDbNames', function () {

        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var dbo = db.db('inGameDB');
            dbo.collection("inatelGames").find().toArray(function (err, res) {
                if (err) throw err;
                socket.emit('gameNamesData', res);
                db.close();
            });
        });


    });


    socket.on('newQuiz', function (data) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db('inGameDB');
            dbo.collection('inatelGames').find({}).toArray(function (err, result) {
                if (err) throw err;
                var num = Object.keys(result).length;
                if (num == 0) {
                    data.id = 1
                    num = 1
                } else {
                    data.id = result[num - 1].id + 1;
                }
                var game = data;
                dbo.collection("inatelGames").insertOne(game, function (err, res) {
                    if (err) throw err;
                    db.close();
                });
                db.close();
                socket.emit('startGameFromCreator', num);
            });

        });


    });

});


//Dependencias
const path = require('path');
const http = require('http');
const express = require('express');


//Classes importadas
const { LiveGames } = require('./utils/liveGames');
const publicPath = path.join(__dirname, '../public');
var app = express();
var server = http.createServer(app);
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





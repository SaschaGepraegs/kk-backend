const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
let currentGames = ["devtest"]
gehtslos = false;
currentPlayers = []
var finishedPlayers = []
var finishedPlayersTiming = []

app.get('/', (req, res) => {
    res.send("<h1>Folgende Infos sind bekannt: </h1> <br> <p>Aktuelle Lobbys: </p>" + currentGames + "<br> <p>Geht's los?: </p>" + gehtslos + "<br> <p>Aktuelle Spieler: </p>" + currentPlayers + "<br><p>Liste der fertigen Spieler: </p>" + finishedPlayers + "<br><p>Zeit der gefinisheden Spieler: </p>" + finishedPlayersTiming + "<br><h1>Folgende APIs sind verfügbar: </h1> <br> <p>/gettest</p> <p>/posttest</p> <p>/checkForPlayer</p> <p>/registerLobby</p> <p>/gehtsLos</p> <p>/losGehts</p> <p>/binDa</p> <p>/finishCall</p> <p>/getFinishedPlayers</p> <p>/reset</p>");
});

app.get('/gettest', (req, res) => {
    res.send("Danke!");
});

app.post('/posttest', (req, res) => {
    var ergebnis = req.body.test
    res.send("Danke, dass du " + ergebnis + " übermittelt hast!")
});

app.post('/checkForPlayer', (req, res) => {
    if (currentPlayers.includes(req.body.username)) {
        res.send(true)
    } else {
        res.send(false)
    }
})

app.post('/registerLobby', (req, res) => {
    currentGames.push(req.body.gamepin)
    res.send(currentGames)
})

app.get('/gehtsLos', (req, res) => {
    if (gehtslos == true) {
        res.send(gehtslos)
    } else {
        res.send(currentPlayers)
    }
})

app.get('/losGehts', (req, res) => {
    gehtslos = true;
    res.send("oke");
})

app.post('/binDa', (req, res) => {
    currentPlayers.push(req.body.username)
    res.send(currentPlayers)
})

app.post('/finishCall', (req, res) => {
    if (finishedPlayers.includes(req.body.username) == false) {
        finishedPlayers.push(req.body.username)
        finishedPlayersTiming.push(Math.floor(new Date().getTime() / 1000.0))
    }
    res.send(finishedPlayers)
})

app.get('/getFinishedPlayers', (req, res) => {
    res.send([finishedPlayers, finishedPlayersTiming])
})

app.get('/reset', (req, res) => {
    gehtslos = false;
    currentPlayers = [];
    beleidigungen = []
    finishedPlayers = []
    finishedPlayersTiming = []
    res.send("erfolgreich resettet")
})

app.listen(3000);
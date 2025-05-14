const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// Datenstruktur für Lobbys
let lobbies = {
    1111: {
        players: [],
        finishedPlayers: [],
        finishedPlayersTiming: [],
        gehtslos: false
    }
};

app.get('/', (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send("<h1>Folgende Infos sind bekannt: </h1> <br> <p>Aktuelle Lobbys: </p>" + Object.keys(lobbies).join(", ") + "<br><h1>Folgende APIs sind verfügbar: </h1> <br> <p>/gettest</p> <p>/posttest</p> <p>/checkForPlayer</p> <p>/registerLobby</p> <p>/gehtsLos</p> <p>/losGehts</p> <p>/binDa</p> <p>/finishCall</p> <p>/getFinishedPlayers</p> <p>/reset</p> <p>/getOpenLobbyList</p>");
});

app.get('/gettest', (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send("Danke!");
});

app.post('/posttest', (req, res) => {
    var ergebnis = req.body.test;
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send("Danke, dass du " + ergebnis + " übermittelt hast!");
});

app.post('/checkForPlayer', (req, res) => {
    const { lobby, username } = req.body;
    if (lobbies[lobby] && lobbies[lobby].players.includes(username)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(true);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(false);
    }
});

app.post('/registerLobby', (req, res) => {
    const { gamepin } = req.body;
    if (!lobbies[gamepin]) {
        lobbies[gamepin] = {
            players: [],
            finishedPlayers: [],
            finishedPlayersTiming: [],
            gehtslos: false
        };
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(Object.keys(lobbies));
});

app.get('/getAllPlayersOfLobby', (req, res) => {
    const { lobby } = req.query;
    if (lobbies[lobby]) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].players);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/gehtsLos', (req, res) => {
    const { lobby } = req.query;
    if (lobbies[lobby]) {
        if (lobbies[lobby].gehtslos == true) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send(true);
        } else {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send(false);
        }
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/losGehts', (req, res) => {
    const { lobby } = req.query;
    if (lobbies[lobby]) {
        lobbies[lobby].gehtslos = true;
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("oke");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.post('/binDa', (req, res) => {
    const { lobby, username } = req.body;
    if (lobbies[lobby]) {
        if (!lobbies[lobby].players.includes(username)) {
            lobbies[lobby].players.push(username);
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].players);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.post('/finishCall', (req, res) => {
    const { lobby, username } = req.body;
    if (lobbies[lobby]) {
        if (!lobbies[lobby].finishedPlayers.includes(username)) {
            lobbies[lobby].finishedPlayers.push(username);
            lobbies[lobby].finishedPlayersTiming.push(Math.floor(new Date().getTime() / 1000.0));
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].finishedPlayers);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/getFinishedPlayers', (req, res) => {
    const { lobby } = req.query;
    if (lobbies[lobby]) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send([lobbies[lobby].finishedPlayers, lobbies[lobby].finishedPlayersTiming]);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/getOpenLobbyList', (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(Object.keys(lobbies));
});

app.get('/reset', (req, res) => {
    const { lobby } = req.query;
    if (lobbies[lobby]) {
        lobbies[lobby] = {
            players: [],
            finishedPlayers: [],
            finishedPlayersTiming: [],
            gehtslos: false
        };
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("Lobby erfolgreich resettet");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.listen(3000);
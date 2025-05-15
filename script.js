const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const Redis = require("ioredis");

// Hilfsfunktionen für Redis
async function getLobbies() {
    try {
        const client = new Redis(process.env.REDIS_URL);
        const value = await client.get("lobbies");
        client.disconnect();
        if (value) {
            return JSON.parse(value);
        } else {
            return {};
        }
    } catch (err) {
        console.error("Fehler beim Laden aus Redis:", err.message);
        return {};
    }
}

async function saveLobbies(lobbies) {
    try {
        const client = new Redis(process.env.REDIS_URL);
        await client.set("lobbies", JSON.stringify(lobbies));
        client.disconnect();
    } catch (err) {
        console.error("Fehler beim Speichern in Redis:", err.message);
    }
}

app.get('/', async(req, res) => {
    const lobbies = await getLobbies();
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

app.post('/checkForPlayer', async(req, res) => {
    const { lobby, username } = req.body;
    const lobbies = await getLobbies();
    if (lobbies[lobby] && lobbies[lobby].players.includes(username)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(true);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(false);
    }
});

app.post('/registerLobby', async(req, res) => {
    const { gamepin } = req.body;
    const lobbies = await getLobbies();
    if (!lobbies[gamepin]) {
        lobbies[gamepin] = {
            players: [],
            finishedPlayers: [],
            finishedPlayersTiming: [],
            gehtslos: false
        };
        await saveLobbies(lobbies);
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(Object.keys(lobbies));
});

app.get('/getAllPlayersOfLobby', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].players);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/gehtsLos', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
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

app.get('/losGehts', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        lobbies[lobby].gehtslos = true;
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("oke");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.post('/binDa', async(req, res) => {
    const { lobby, username } = req.body;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].players.includes(username)) {
            lobbies[lobby].players.push(username);
            await saveLobbies(lobbies);
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].players);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.post('/finishCall', async(req, res) => {
    const { lobby, username } = req.body;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].finishedPlayers.includes(username)) {
            lobbies[lobby].finishedPlayers.push(username);
            lobbies[lobby].finishedPlayersTiming.push(Math.floor(new Date().getTime() / 1000.0));
            await saveLobbies(lobbies);
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].finishedPlayers);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/getFinishedPlayers', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send([lobbies[lobby].finishedPlayers, lobbies[lobby].finishedPlayersTiming]);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/getOpenLobbyList', async(req, res) => {
    const lobbies = await getLobbies();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(Object.keys(lobbies));
});

app.get('/reset', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        lobbies[lobby] = {
            players: [],
            finishedPlayers: [],
            finishedPlayersTiming: [],
            gehtslos: false
        };
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("Lobby erfolgreich resettet");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.listen(3000);
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
    res.send("<h1>Folgende Infos sind bekannt: </h1> <br> <p>Aktuelle Lobbys: </p>" + Object.keys(lobbies).join(", ") + "<br><h1>Folgende APIs sind verfügbar: </h1> <br> <p>/gettest</p> <p>/posttest</p> <p>/checkForPlayer</p> <p>/registerLobby</p> <p>/gehtsLos</p> <p>/losGehts</p> <p>/binDa</p> <p>/finishCall</p> <p>/getFinishedPlayers</p> <p>/reset</p> <p>/getOpenLobbyList</p> <p>/naechstesSpiel</p> <p>/changeNaechstesSpiel</p> <p>/kfc_feedback_code</p> <p>/addPointsToPlayer</p> <p>/getPointsOfPlayer</p>");
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
            gehtslos: false,
            aktuellesSpiel: null, // Neues Feld für aktuelle Spiel-ID
            punkte: {} // Neues Feld für Punkte pro Spieler
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
            gehtslos: false,
            aktuellesSpiel: null, // Korrigiert: false → null
            punkte: {} // Punkte auch zurücksetzen
        };
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("Lobby erfolgreich resettet");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/naechstesSpiel', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const aktuellesSpiel = lobbies[lobby].aktuellesSpiel;
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        if (typeof aktuellesSpiel === "number" && aktuellesSpiel >= 1 && aktuellesSpiel <= 20) {
            res.send(aktuellesSpiel.toString());
        } else {
            res.send(false);
        }
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/changeNaechstesSpiel', async(req, res) => {
    const { lobby, spielid } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const id = parseInt(spielid, 10);
        if (Number.isInteger(id) && id >= 1 && id <= 20) {
            lobbies[lobby].aktuellesSpiel = id;
            await saveLobbies(lobbies);
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send("aktuellesSpiel geändert auf " + id);
            // Nach 10 Sekunden aktuellesSpiel wieder auf null setzen und speichern und so zeug
            setTimeout(async () => {
                const lobbiesTimeout = await getLobbies();
                if (lobbiesTimeout[lobby] && lobbiesTimeout[lobby].aktuellesSpiel === id) {
                    lobbiesTimeout[lobby].aktuellesSpiel = null;
                    await saveLobbies(lobbiesTimeout);
                }
            }, 10000);

        } else if (spielid === "false" || spielid === "null") {
            lobbies[lobby].aktuellesSpiel = null;
            await saveLobbies(lobbies);
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send("aktuellesSpiel auf null gesetzt");
        } else {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.status(400).send("Ungültige Spiel-ID");
        }
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/kfc_feedback_code', (req, res) => {
  const t = Math.floor(Math.random() * 900) + 100;
  const d = new Date();
  const dateStr = d.getFullYear().toString().slice(-2) + 
                  String(d.getMonth() + 1).padStart(2, '0') + 
                  String(d.getDate()).padStart(2, '0');
  res.send(`GER318${t}${dateStr}`);
});

app.get('/addPointsToPlayer', async(req, res) => {
    const { lobby, spieler, punkte } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].punkte) {
            lobbies[lobby].punkte = {};
        }
        const punkteInt = parseInt(punkte, 10);
        if (!Number.isInteger(punkteInt)) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.status(400).send("Ungültige Punktezahl");
            return;
        }
        if (!lobbies[lobby].punkte[spieler]) {
            lobbies[lobby].punkte[spieler] = 0;
        }
        lobbies[lobby].punkte[spieler] += punkteInt;
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(`Punkte von ${spieler} in Lobby ${lobby}: ${lobbies[lobby].punkte[spieler]}`);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/getPointsOfPlayer', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const punkteObj = lobbies[lobby].punkte || {};
        // Array mit Objekten: [{spieler: name, punkte: zahl}, ...]
        const punkteArray = Object.keys(punkteObj).map(spieler => ({
            spieler,
            punkte: punkteObj[spieler]
        }));
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(punkteArray);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.listen(3000);
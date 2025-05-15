const express = require("express");
const cors = require("cors");
const { kv } = require("@vercel/kv");

const app = express();
app.use(cors());
app.use(express.json());

const CACHE_HEADER = { "Cache-Control": "no-cache, no-store, must-revalidate" };

// Hilfsfunktion, um Lobbys zu laden/speichern
async function getLobbies() {
    return (await kv.get("lobbies")) || {};
}

async function saveLobbies(lobbies) {
    await kv.set("lobbies", lobbies);
}

// Beispielroute
app.get("/", async(req, res) => {
    const lobbies = await getLobbies();
    res.set(CACHE_HEADER).send(
        "<h1>Folgende Infos sind bekannt:</h1><br><p>Aktuelle Lobbys: </p>" +
        Object.keys(lobbies).join(", ") +
        "<br><h1>Folgende APIs sind verfügbar:</h1><br><p>/gettest</p><p>/posttest</p><p>/checkForPlayer</p><p>/registerLobby</p><p>/gehtsLos</p><p>/losGehts</p><p>/binDa</p><p>/finishCall</p><p>/getFinishedPlayers</p><p>/reset</p><p>/getOpenLobbyList</p>"
    );
});

app.get("/gettest", (req, res) => {
    res.set(CACHE_HEADER).send("Danke!");
});

app.post("/posttest", (req, res) => {
    const { test } = req.body;
    res.set(CACHE_HEADER).send(`Danke, dass du ${test} übermittelt hast!`);
});

app.post("/checkForPlayer", async(req, res) => {
    const { lobby, username } = req.body;
    const lobbies = await getLobbies();

    let isInLobby = false;

    if (lobbies[lobby] && Array.isArray(lobbies[lobby].players)) {
        isInLobby = lobbies[lobby].players.includes(username);
    }

    res.set(CACHE_HEADER).send(isInLobby);
});


app.post("/registerLobby", async(req, res) => {
    const { gamepin } = req.body;
    const lobbies = await getLobbies();

    if (!lobbies[gamepin]) {
        lobbies[gamepin] = {
            players: [],
            finishedPlayers: [],
            finishedPlayersTiming: [],
            gehtslos: false,
        };
        await saveLobbies(lobbies);
    }

    res.set(CACHE_HEADER).send(Object.keys(lobbies));
});

app.get("/getAllPlayersOfLobby", async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        res.set(CACHE_HEADER).send(lobbies[lobby].players);
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.get("/gehtsLos", async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        res.set(CACHE_HEADER).send(lobbies[lobby].gehtslos);
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.get("/losGehts", async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        lobbies[lobby].gehtslos = true;
        await saveLobbies(lobbies);
        res.set(CACHE_HEADER).send("oke");
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.post("/binDa", async(req, res) => {
    const { lobby, username } = req.body;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        if (!lobbies[lobby].players.includes(username)) {
            lobbies[lobby].players.push(username);
            await saveLobbies(lobbies);
        }
        res.set(CACHE_HEADER).send(lobbies[lobby].players);
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.post("/finishCall", async(req, res) => {
    const { lobby, username } = req.body;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        if (!lobbies[lobby].finishedPlayers.includes(username)) {
            lobbies[lobby].finishedPlayers.push(username);
            lobbies[lobby].finishedPlayersTiming.push(
                Math.floor(new Date().getTime() / 1000.0)
            );
            await saveLobbies(lobbies);
        }
        res.set(CACHE_HEADER).send(lobbies[lobby].finishedPlayers);
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.get("/getFinishedPlayers", async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        res.set(CACHE_HEADER).send([
            lobbies[lobby].finishedPlayers,
            lobbies[lobby].finishedPlayersTiming,
        ]);
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.get("/getOpenLobbyList", async(req, res) => {
    const lobbies = await getLobbies();
    res.set(CACHE_HEADER).send(Object.keys(lobbies));
});

app.get("/reset", async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();

    if (lobbies[lobby]) {
        lobbies[lobby] = {
            players: [],
            finishedPlayers: [],
            finishedPlayersTiming: [],
            gehtslos: false,
        };
        await saveLobbies(lobbies);
        res.set(CACHE_HEADER).send("Lobby erfolgreich resettet");
    } else {
        res.set(CACHE_HEADER).status(404).send("Lobby nicht gefunden");
    }
});

app.listen(3000);
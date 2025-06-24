const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
app.use(cors());
app.use(express.json());

const Redis = require("ioredis");

// Begriffe für Crewmates
const CREWMATE_WORDS = [
    "Apfel", "Banane", "Kaktus", "Pyramide", "Schmetterling", "Rakete", "Känguru", "Wolke", "Bleistift", "Kaffee",
    "Schnecke", "Trompete", "Keks", "Roboter", "Kaktus", "Kran", "Giraffe", "Komet", "Kirsche", "Koffer",
    "Krokodil", "Kugel", "Kuh", "Kuchen", "Karte", "Kamel", "Käfer", "Kette", "Kissen", "Kanu"
];

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

// Hilfsfunktion: Imposter und Crewmate-Wort neu bestimmen
function assignImposterAndWord(lobbyObj) {
    const players = lobbyObj.players || [];
    if (players.length === 0) {
        lobbyObj.imposter = [];
        lobbyObj.crewmateWord = null;
        return;
    }
    // Anzahl Imposter bestimmen
    const imposterCount = players.length > 6 ? 2 : 1;
    // Spieler zufällig mischen
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    lobbyObj.imposter = shuffled.slice(0, imposterCount);
    // Wort zufällig wählen
    lobbyObj.crewmateWord = CREWMATE_WORDS[Math.floor(Math.random() * CREWMATE_WORDS.length)];
}

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/doc.html'));
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
            naechsteSpiele: [],
            punkte: {},
            imposterVotes: {},
            removedPlayers: [],
            revealedImposters: [],
            voteForElection: [] // Neu: Spieler, die bereit für Wahlphase sind
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
        if (!lobbies[lobby].players.includes(username) && !lobbies[lobby].removedPlayers.includes(username)) { // Überprüfen, ob sich der Spieler schon im Spiel befindet und nicht schon entfernt wurde
            lobbies[lobby].players.push(username);
            // Imposter und Wort neu bestimmen
            assignImposterAndWord(lobbies[lobby]);
            // Votes zurücksetzen
            lobbies[lobby].imposterVotes = {};
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
        delete lobbies[lobby];
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("Lobby erfolgreich gelöscht");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/naechstesSpiel', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const naechsteSpiele = lobbies[lobby].naechsteSpiele || [];
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(naechsteSpiele);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/changeNaechstesSpiel', async(req, res) => {
    // Hole die Lobby und das Spiel-ID-Array aus den Query-Parametern
    const { lobby, spielid } = req.query;
    const lobbies = await getLobbies();

    // Prüfe, ob die Lobby existiert
    if (!lobbies[lobby]) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
        return;
    }

    // Prüfe, ob spielid wirklich ein Array ist (z.B. spielid[]=1&spielid[]=2)
    if (!Array.isArray(spielid)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(400).send("spielid muss ein Array sein");
        return;
    }

    // Initialisiere das Array für die nächsten Spiele, falls es noch nicht existiert
    if (!lobbies[lobby].naechsteSpiele) {
        lobbies[lobby].naechsteSpiele = [];
    }

    // Sonderfall: Wenn das Array nur "false" oder "null" enthält, leere die Liste der nächsten Spiele
    if (spielid.length === 1 && (spielid[0] === "false" || spielid[0] === "null")) {
        lobbies[lobby].naechsteSpiele = [];
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].naechsteSpiele);
        return;
    }

    // Wandle alle Spiel-IDs in Zahlen um und filtere nur gültige IDs (Ganzzahlen zwischen 1 und 20)
    const validIds = spielid
        .map(id => parseInt(id, 10))
        .filter(id => Number.isInteger(id) && id >= 1 && id <= 20);

    // Wenn nicht alle übergebenen IDs gültig sind, gib einen Fehler zurück
    if (validIds.length !== spielid.length) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(400).send("Alle Spiel-IDs müssen Ganzzahlen zwischen 1 und 20 sein");
        return;
    }

    // Füge alle gültigen Spiel-IDs zur Liste der nächsten Spiele hinzu
    lobbies[lobby].naechsteSpiele.push(...validIds);

    // Speichere die aktualisierten Lobbys in der Datenbank
    await saveLobbies(lobbies);

    // Setze Header, damit nichts gecacht wird, und sende die neue Liste zurück
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(lobbies[lobby].naechsteSpiele);
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

app.get('/removePlayer', async(req, res) => {
    const { lobby, spieler } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        lobbies[lobby].players = (lobbies[lobby].players || []).filter(name => name !== spieler);
        lobbies[lobby].finishedPlayers = (lobbies[lobby].finishedPlayers || []).filter(name => name !== spieler);
        // Neu: Entfernten Spieler zur Liste der entfernten Spieler hinzufügen
        if(!lobbies[lobby].removedPlayers.includes(spieler)) { // zuerst prüfen, ob der Spieler nicht schon entfernt wurde
            lobbies[lobby].removedPlayers.push(spieler); // und dann entfernten Spieler zur Liste hinzufügen
        }
        // Punkte des Spielers entfernen, falls vorhanden
        if (lobbies[lobby].punkte && lobbies[lobby].punkte[spieler] !== undefined) {
            delete lobbies[lobby].punkte[spieler];
        }
        // Imposter und Wort neu bestimmen
        assignImposterAndWord(lobbies[lobby]);
        // Votes zurücksetzen
        lobbies[lobby].imposterVotes = {};
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(`Spieler ${spieler} wurde aus Lobby ${lobby} entfernt.`);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

// Neuer Endpunkt: /castImposterVote
app.get('/castImposterVote', async(req, res) => {
    const { lobby, elect } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].imposterVotes) {
            lobbies[lobby].imposterVotes = {};
        }
        if (!lobbies[lobby].players.includes(elect)) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.status(400).send("Spieler nicht in Lobby");
            return;
        }
        lobbies[lobby].imposterVotes[elect] = (lobbies[lobby].imposterVotes[elect] || 0) + 1;
        await saveLobbies(lobbies);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send("Vote gezählt");
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

// Neuer Endpunkt: /getImposterVoting
app.get('/getImposterVoting', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const votes = lobbies[lobby].imposterVotes || {};
        const players = lobbies[lobby].players || [];
        const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0) || 0;
        const result = players.map(spieler => ({
            spieler,
            prozent: totalVotes > 0 ? Math.round((votes[spieler] || 0) / totalVotes * 100) : 0
        }));
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(result);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

// Angepasster Endpunkt: /istImposter
app.get('/istImposter', async(req, res) => {
    const { lobby, spieler } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].imposter || !lobbies[lobby].crewmateWord) {
            assignImposterAndWord(lobbies[lobby]);
            await saveLobbies(lobbies);
        }
        const imposters = lobbies[lobby].imposter || [];
        if (imposters.includes(spieler)) {
            // Imposter-Array: ["imposter", <andererImposterName|du bist der einzige>]
            let otherImposter = imposters.filter(name => name !== spieler);
            let info = otherImposter.length > 0 ? otherImposter[0] : "du bist der einzige";
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send(["imposter", info]);
        } else {
            // Crewmate-Array: ["crewmate", <wort>]
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send(["crewmate", lobbies[lobby].crewmateWord || ""]);
        }
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/revealImposter', async(req, res) => {
    const { lobby, spieler } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].revealedImposters) {
            lobbies[lobby].revealedImposters = [];
        }
        if (
            lobbies[lobby].imposter &&
            lobbies[lobby].imposter.includes(spieler) &&
            !lobbies[lobby].revealedImposters.includes(spieler)
        ) {
            lobbies[lobby].revealedImposters.push(spieler);
            await saveLobbies(lobbies);
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send(`Imposter ${spieler} wurde als enttarnt registriert.`);
        } else {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.send(`Spieler ${spieler} ist kein Imposter oder bereits enttarnt.`);
        }
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.get('/areAllImpostersRevealed', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const imposters = lobbies[lobby].imposter || [];
        const revealed = lobbies[lobby].revealedImposters || [];
        const allRevealed = imposters.length > 0 && imposters.every(name => revealed.includes(name));
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(allRevealed);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

// Sammel-Endpunkt: Lobby-Info
app.get('/lobbyInfo', async(req, res) => {
    const { lobby } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const lobbyObj = lobbies[lobby];
        // 2/3-Mehrheit für Wahlphase berechnen
        const playerCount = (lobbyObj.players || []).length;
        const electionVotes = (lobbyObj.voteForElection || []).length;
        const goToElection = playerCount > 0 && electionVotes >= Math.ceil(playerCount * 2 / 3);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send({
            players: lobbyObj.players || [],
            finishedPlayers: lobbyObj.finishedPlayers || [],
            finishedPlayersTiming: lobbyObj.finishedPlayersTiming || [],
            gehtslos: lobbyObj.gehtslos || false,
            naechsteSpiele: lobbyObj.naechsteSpiele || [],
            punkte: lobbyObj.punkte || {},
            imposterVotes: lobbyObj.imposterVotes || {},
            removedPlayers: lobbyObj.removedPlayers || [],
            revealedImposters: lobbyObj.revealedImposters || [],
            imposter: lobbyObj.imposter || [],
            crewmateWord: lobbyObj.crewmateWord || null,
            goToElection // Neu: true/false, ob 2/3 bereit sind
        });
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

// Sammel-Endpunkt: Spieler-Info
app.get('/playerInfo', async(req, res) => {
    const { lobby, spieler } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        const lobbyObj = lobbies[lobby];
        const isImposter = (lobbyObj.imposter || []).includes(spieler);
        let roleInfo;
        if (isImposter) {
            let otherImposter = (lobbyObj.imposter || []).filter(name => name !== spieler);
            roleInfo = {
                rolle: "imposter",
                partner: otherImposter.length > 0 ? otherImposter[0] : "du bist der einzige"
            };
        } else {
            roleInfo = {
                rolle: "crewmate",
                wort: lobbyObj.crewmateWord || ""
            };
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send({
            name: spieler,
            punkte: (lobbyObj.punkte && lobbyObj.punkte[spieler]) || 0,
            finished: (lobbyObj.finishedPlayers || []).includes(spieler),
            removed: (lobbyObj.removedPlayers || []).includes(spieler),
            imposterVote: (lobbyObj.imposterVotes && lobbyObj.imposterVotes[spieler]) || 0,
            revealed: (lobbyObj.revealedImposters || []).includes(spieler),
            ...roleInfo
        });
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

// Neuer Endpunkt: /voteForElection
app.get('/voteForElection', async(req, res) => {
    const { lobby, spieler } = req.query;
    const lobbies = await getLobbies();
    if (lobbies[lobby]) {
        if (!lobbies[lobby].voteForElection) {
            lobbies[lobby].voteForElection = [];
        }
        if (!lobbies[lobby].players.includes(spieler)) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.status(400).send("Spieler nicht in Lobby");
            return;
        }
        if (!lobbies[lobby].voteForElection.includes(spieler)) {
            lobbies[lobby].voteForElection.push(spieler);
            await saveLobbies(lobbies);
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(lobbies[lobby].voteForElection);
    } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.status(404).send("Lobby nicht gefunden");
    }
});

app.listen(3000);

const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, EmbedBuilder } = require("discord.js");
const express = require("express");
const fetch = require("node-fetch");

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;
const OWNER_ID = "1230970282894954646"; // ton ID

// Ping auto pour Render
setInterval(() => {
  fetch("https://TON-URL-RENDER.onrender.com").catch(() => {});
}, 4 * 60 * 1000);

app.get("/", (req, res) => res.send("Bot actif ✅"));
app.listen(3000, () => console.log("🌐 Serveur HTTP lancé"));

// suite des commandes dans la partie suivante...
client.on("ready", () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
});

client.login(TOKEN);

const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.TOKEN; // Ton token dans Render
const OWNER_IDS = ["1230970282894954646"]; // Ajoute d'autres owners ici si besoin

let welcomeChannelId = null;
let welcomeMessage = "Bienvenue @mention !";
let bioTrigger = { text: null, roleId: null };
let commandPerms = {}; // { ban: [roleId1], mute: [roleId2], etc }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel],
});

// === Express Server ===
app.get("/", (req, res) => res.send("Bot en ligne ✅"));
app.listen(PORT, () => console.log(`🌐 Serveur HTTP sur port ${PORT}`));

// === Ping Auto Render ===
setInterval(() => {
  fetch("TON_URL_RENDER").then(() => console.log("⏱️ Ping auto envoyé")).catch(() => {});
}, 240000); // 4 minutes

// === Events ===
client.on("ready", () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
});

client.on("guildMemberAdd", member => {
  if (!welcomeChannelId) return;
  const ch = member.guild.channels.cache.get(welcomeChannelId);
  if (!ch) return;
  ch.send({ content: welcomeMessage.replace("@mention", `<@${member.id}>`) })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 1000));
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
  const member = newPresence.member;
  if (!member || !bioTrigger.text || !bioTrigger.roleId) return;
  const bio = member.presence?.activities?.[0]?.state || "";
  if (bio.includes(bioTrigger.text)) {
    member.roles.add(bioTrigger.roleId).catch(() => {});
  }
});

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot || !message.content.startsWith("+")) return;

  const args = message.content.slice(1).trim().split(/ +/g);
  const cmd = args.shift().toLowerCase();

  const isOwner = OWNER_IDS.includes(message.author.id);

  // === HELP ===
  if (cmd === "help") {
    return message.channel.send("📚 Commandes : +ticket, +stats, +clear, +ban, +kick, +mute, +invites, +voicetime, +setperm, +addrole, +setwelcome, +setbiotrig, +addowner, +servers, +leave");
  }

  // === TICKET ===
  if (cmd === "ticket") {
    const ticketChannel = await message.guild.channels.create({
      name: `ticket-${message.author.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: message.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: message.author.id, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const closeBtn = new ButtonBuilder().setCustomId("close_ticket").setLabel("Fermer").setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(closeBtn);
    ticketChannel.send({ content: `<@${message.author.id}> Ticket créé !`, components: [row] });
  }

  // === BUTTON HANDLER ===
  if (message.customId === "close_ticket") {
    message.channel.delete().catch(() => {});
  }

  // === STATS ===
  if (cmd === "stats") {
    const online = message.guild.members.cache.filter(m => m.presence?.status === "online").size;
    const voice = message.guild.channels.cache.filter(c => c.type === 2).reduce((acc, c) => acc + c.members.size, 0);
    const total = message.guild.memberCount;
    const embed = new EmbedBuilder()
      .setTitle("📊 Statistiques du serveur")
      .setDescription(`👥 Membres en ligne : ${online}\n🔊 En vocal : ${voice}\n🧮 Total membres : ${total}`)
      .setImage("https://media.tenor.com/G_JZ13GFLyYAAAAd/gojo-satoru.gif")
      .setColor("Blue");
    message.channel.send({ embeds: [embed] });
  }

  // === CLEAR ===
  if (cmd === "clear") {
    if (!hasPerm(message, "clear")) return;
    const count = parseInt(args[0]);
    if (!count) return message.reply("Donne un nombre.");
    message.channel.bulkDelete(count + 1).catch(() => {});
  }

  // === BAN ===
  if (cmd === "ban") {
    if (!hasPerm(message, "ban")) return;
    const member = message.mentions.members.first();
    if (member) member.ban().catch(() => {});
  }

  // === KICK ===
  if (cmd === "kick") {
    if (!hasPerm(message, "kick")) return;
    const member = message.mentions.members.first();
    if (member) member.kick().catch(() => {});
  }

  // === MUTE ===
  if (cmd === "mute") {
    if (!hasPerm(message, "mute")) return;
    const member = message.mentions.members.first();
    if (member) {
      const role = message.guild.roles.cache.find(r => r.name === "Muted");
      if (role) member.roles.add(role).catch(() => {});
    }
  }

  // === ADDROLE ===
  if (cmd === "addrole") {
    if (!hasPerm(message, "addrole")) return;
    const member = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (member && role) member.roles.add(role).catch(() => {});
  }

  // === SETPERM ===
  if (cmd === "setperm" && isOwner) {
    const action = args[0];
    const role = message.mentions.roles.first();
    if (!action || !role) return;
    commandPerms[action] = commandPerms[action] || [];
    commandPerms[action].push(role.id);
    message.reply(`✅ Rôle ${role.name} autorisé à utiliser ${action}`);
  }

  // === SETWELCOME ===
  if (cmd === "setwelcome" && isOwner) {
    const ch = message.mentions.channels.first();
    const msg = args.slice(1).join(" ");
    if (ch && msg) {
      welcomeChannelId = ch.id;
      welcomeMessage = msg;
      message.reply("✅ Message de bienvenue défini.");
    }
  }

  // === SETBIOTRIG ===
  if (cmd === "setbiotrig" && isOwner) {
    const text = args[0];
    const role = message.mentions.roles.first();
    if (text && role) {
      bioTrigger = { text, roleId: role.id };
      message.reply("✅ Bio trigger défini.");
    }
  }

  // === ADDOWNER ===
  if (cmd === "addowner" && isOwner) {
    const user = message.mentions.users.first();
    if (user && !OWNER_IDS.includes(user.id)) {
      OWNER_IDS.push(user.id);
      message.reply(`✅ ${user.tag} est maintenant owner du bot.`);
    }
  }

  // === SERVERS ===
  if (cmd === "servers" && isOwner) {
    const list = client.guilds.cache.map(g => `${g.name} (${g.id})`).join("\n");
    message.author.send("📋 Serveurs:\n" + list);
  }

  // === LEAVE ===
  if (cmd === "leave" && isOwner) {
    const id = args[0];
    const guild = client.guilds.cache.get(id);
    if (guild) {
      guild.leave().then(() => message.reply("✅ Serveur quitté."));
    }
  }

  // === INVITES ===
  if (cmd === "invites") {
    const invites = await message.guild.invites.fetch();
    const userInv = invites.filter(i => i.inviter?.id === message.author.id).reduce((acc, cur) => acc + cur.uses, 0);
    message.reply(`📨 Tu as invité ${userInv} membres.`);
  }

  // === VOICETIME ===
  if (cmd === "voicetime") {
    // Implémentation personnalisée, nécessite base de données si tu veux le vrai total
    message.reply("⏳ Temps vocal : Fonctionnalité à venir.");
  }

});

// === FONCTION ===
function hasPerm(message, action) {
  if (OWNER_IDS.includes(message.author.id)) return true;
  const perms = commandPerms[action] || [];
  return message.member.roles.cache.some(r => perms.includes(r.id));
}

client.login(TOKEN);

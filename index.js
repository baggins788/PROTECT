// index.js
const { Client, GatewayIntentBits, Partials, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Ping Express Server
app.get("/", (req, res) => res.send("Bot is online ✅"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Serveur actif sur le port ${PORT}`));

setInterval(() => {
  fetch("https://ton-url-render.onrender.com").catch(() => {});
}, 4 * 60 * 1000);

// Configs
const config = require("./config.json");

// Helper pour vérifier owner
function isOwner(userId) {
  return config.owners.includes(userId);
}

// Blacklist auto + logs abus
const abuseTracker = {};

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // Permission check
  const hasPerm = (cmdName) => {
    const roles = config.permissions[cmdName] || [];
    return (
      isOwner(message.author.id) ||
      message.member.roles.cache.some(role => roles.includes(role.id))
    );
  };

  // +addowner
  if (cmd === "addowner" && isOwner(message.author.id)) {
    const member = message.mentions.members.first();
    if (member && !config.owners.includes(member.id)) {
      config.owners.push(member.id);
      fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
      return message.reply(`✅ ${member.user.tag} est maintenant owner.`);
    }
  }

  // +setperm kick @role
  if (cmd === "setperm" && isOwner(message.author.id)) {
    const [permCmd, roleMention] = args;
    const role = message.mentions.roles.first();
    if (!config.permissions[permCmd]) config.permissions[permCmd] = [];
    config.permissions[permCmd].push(role.id);
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
    return message.reply(`✅ Le rôle ${role.name} peut maintenant utiliser ${permCmd}`);
  }

  // +kick
  if (cmd === "kick" && hasPerm("kick")) {
    const member = message.mentions.members.first();
    if (member) {
      await member.kick(args.slice(1).join(" ") || "");
      return message.reply(`👢 ${member.user.tag} a été kick.`);
    }
  }

  // +ban
  if (cmd === "ban" && hasPerm("ban")) {
    const member = message.mentions.members.first();
    if (member) {
      await member.ban({ reason: args.slice(1).join(" ") });
      return message.reply(`🔨 ${member.user.tag} a été banni.`);
    }
  }

  // +mute
  if (cmd === "mute" && hasPerm("mute")) {
    const member = message.mentions.members.first();
    const role = message.guild.roles.cache.find(r => r.name === "Muted");
    if (member && role) {
      await member.roles.add(role);
      return message.reply(`🔇 ${member.user.tag} a été mute.`);
    }
  }

  // +ticket
  if (cmd === "ticket" && hasPerm("ticket")) {
    const channel = await message.guild.channels.create({
      name: `ticket-${message.author.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: message.author.id, allow: [PermissionsBitField.Flags.ViewChannel] },
      ],
    });

    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Fermer")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);
    await channel.send({ content: `🎫 Ticket ouvert par ${message.author}`, components: [row] });
  }

  // +clear 10
  if (cmd === "clear" && hasPerm("clear")) {
    const amount = parseInt(args[0]);
    if (!isNaN(amount)) {
      await message.channel.bulkDelete(amount);
      return message.channel.send(`🧹 ${amount} messages supprimés.`).then(msg => setTimeout(() => msg.delete(), 3000));
    }
  }

  // +stats
  if (cmd === "stats") {
    const online = message.guild.members.cache.filter(m => m.presence?.status === "online").size;
    const voice = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).reduce((acc, c) => acc + c.members.size, 0);
    const embed = new EmbedBuilder()
      .setTitle("📊 Statistiques du serveur")
      .setDescription(`👥 En ligne : ${online}\n🎤 En vocal : ${voice}`)
      .setImage("https://media.tenor.com/AK7hfi3nBAgAAAAC/gojo.gif")
      .setColor("Blue");
    message.channel.send({ embeds: [embed] });
  }
});

// Ticket auto fermeture
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId === "close_ticket") {
    await interaction.channel.delete();
  }
});

client.login(process.env.TOKEN);

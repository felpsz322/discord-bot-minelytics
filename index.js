// index.js
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res)=> {
  res.send("Bot online");
});

app.listen(PORT, ()=>{
  console.log("server running on port" + PORT);
});

// ------------------------
// IMPORTS
// ------------------------
require('dotenv').config(); // Para carregar variáveis do .env
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const util = require('minecraft-server-util');

// ------------------------
// VARIÁVEIS DO BOT
// ------------------------
const TOKEN = process.env.TOKEN;           // Token do bot
const CLIENT_ID = process.env.CLIENT_ID;   // ID da aplicação
const GUILD_ID = process.env.GUILD_ID;     // ID do servidor Discord
const CHANNEL_ID = process.env.CHANNEL_ID; // ID do canal de voz que será atualizado
const MC_HOST = process.env.MC_HOST;       // IP ou host do servidor Minecraft
const MC_PORT = parseInt(process.env.MC_PORT) || 25565; // Porta do servidor (default 25565)

// ------------------------
// CRIAÇÃO DO CLIENT DO DISCORD
// ------------------------
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ------------------------
// COMANDO /STATUS
// ------------------------
const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra o status do servidor Minecraft')
    .toJSON()
];

// ------------------------
// FUNÇÃO PARA REGISTRAR COMANDO
// ------------------------
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registrarComando() {
  try {
    console.log('Registrando comando...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Comando /status registrado com sucesso!');
  } catch (err) {
    console.error('Erro ao registrar comando:', err);
  }
}

// ------------------------
// FUNÇÃO PARA BUSCAR STATUS DO SERVIDOR
// ------------------------
async function pegarStatusServidor() {
  try {
    // Pega status do servidor Java Edition
    const status = await util.status(MC_HOST, MC_PORT);
    return {
      online: true,
      playersOnline: status.players.online,
      playersMax: status.players.max,
      version: status.version.name,
      motd: status.motd.clean
    };
  } catch (err) {
    // Se der erro, considera offline
    return { online: false };
  }
}

// ------------------------
// FUNÇÃO PARA ATUALIZAR CANAL DE VOZ
// ------------------------
async function atualizarCanalPlayers() {
  try {
    const canal = await client.channels.fetch(CHANNEL_ID);
    const status = await pegarStatusServidor();

    if (!status.online) {
      await canal.setName('🔴 servidor-offline');
      return;
    }

    const novoNome = `🟢 players-online: ${status.playersOnline}/${status.playersMax}`;
    await canal.setName(novoNome);

  } catch (err) {
    console.error('Erro ao atualizar canal:', err);
  }
}

// ------------------------
// EVENTO READY
// ------------------------
client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  // Atualiza o canal imediatamente
  atualizarCanalPlayers();

  // Atualiza a cada 60 segundos
  setInterval(atualizarCanalPlayers, 60 * 1000);
});

// ------------------------
// EVENTO INTERAÇÃO (slash command)
// ------------------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'status') {
    const status = await pegarStatusServidor();

    if (!status.online) {
      await interaction.reply('🔴 Servidor OFFLINE');
      return;
    }

    await interaction.reply(
      `🟢 Servidor ONLINE\n` +
      `👥 Players: ${status.playersOnline}/${status.playersMax}\n` +
      `🧩 Versão: ${status.version}\n` +
      `📜 MOTD: ${status.motd}`
    );
  }
});

// ------------------------
// INICIAR BOT
// ------------------------
client.login(TOKEN);
registrarComando();
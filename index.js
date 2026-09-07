const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const http = require('http');

// Crear el cliente del bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Evento cuando el bot se conecta a Discord
client.once('ready', () => {
    console.log(`¡Bot encendido como ${client.user.tag}!`);
});

// Evento cuando alguien envía un mensaje
client.on('messageCreate', (message) => {
    if (message.author.bot) return; // Ignorar otros bots

    if (message.content.toLowerCase() === 'hola') {
        message.reply('¡Hola! ¿Cómo estás?');
    }
});

// Servidor web falso obligatorio para que Render no de error
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot activo\n');
});

// Iniciar el servidor web y conectar el bot
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
    client.login(process.env.DISCORD_TOKEN);
});

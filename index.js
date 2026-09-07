
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configurar la IA de Google Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

client.once('ready', () => {
    console.log(`¡Bot con IA encendido como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Responde solo si lo mencionas (ej: @MiBot hola)
    if (message.mentions.has(client.user)) {
        const pregunta = message.content.replace(`<@${client.user.id}>`, '').trim();
        
        if (!pregunta) {
            return message.reply('¡Hola! ¿En qué te puedo ayudar hoy? Pregúntame lo que quieras.');
        }

        await message.channel.sendTyping();

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: pregunta,
            });

            return message.reply(response.text);
        } catch (error) {
            console.error('Error con la IA de Gemini:', error);
            return message.reply('Lo siento, bro. Tuve un pequeño cortocircuito en mi cerebro de IA. Inténtalo de nuevo.');
        }
    }
});

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot con IA activo\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    client.login(process.env.DISCORD_TOKEN);
});

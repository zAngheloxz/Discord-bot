
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

// Inicializar la IA de Google Gemini de forma segura
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

client.once('ready', () => {
    console.log(`¡Bot con IA encendido como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Responde si mencionas al bot
    if (message.mentions.has(client.user)) {
        const pregunta = message.content.replace(`<@${client.user.id}>`, '').trim();
        
        if (!pregunta) {
            return message.reply('¡Hola! ¿En qué te puedo ayudar hoy? Pregúntame lo que quieras.');
        }

        await message.channel.sendTyping();

        try {
            // Estructura de llamada directa y limpia para Gemini 2.5
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: pregunta }] }]
            });

            if (response && response.text) {
                return message.reply(response.text);
            } else {
                return message.reply('La IA no devolvió texto. Revisa la consola.');
            }

        } catch (error) {
            console.error('Error con la IA de Gemini:', error);
            // Esto te dirá en Discord exactamente qué está fallando (ej: API key inválida)
            return message.reply(`❌ Error técnico de IA: \`${error.message}\``);
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


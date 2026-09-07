
import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import 'dotenv/config';

// 1. Configuración del Servidor Web para Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('¡El bot de Discord está vivo!');
});

app.listen(PORT, () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

// 2. Inicialización de la Inteligencia Artificial (Gemini)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Inicialización del cliente de Discord (¡Solo una vez!)
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.once('ready', () => {
    console.log(`¡Conectado exitosamente como ${discordClient.user.tag}!`);
});

// 4. Lógica para procesar los mensajes
discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.mentions.has(discordClient.user)) {
        try {
            await message.channel.sendTyping();

            const prompt = message.content.replace(`<@${discordClient.user.id}>`, '').trim();

            if (!prompt) {
                return message.reply("¡Hola! ¿En qué te puedo ayudar hoy?");
            }

            // Llamada adaptada a la versión moderna de @google/genai
            const response = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
            });

            await message.reply(response.text);

        } catch (error) {
            console.error("Error al procesar la IA:", error);
            await message.reply("❌ Tuve un problema al procesar la solicitud con la IA.");
        }
    }
});

// 5. Autenticación del bot
discordClient.login(process.env.DISCORD_TOKEN);

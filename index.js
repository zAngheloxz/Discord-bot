import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import 'dotenv/config';

// 1. Configuración del Servidor Web para Render (Evita el crash por timeout)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('¡El bot de Discord está vivo y funcionando!');
});

app.listen(PORT, () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

// 2. Inicialización de la Inteligencia Artificial (Gemini)
// Nota: La nueva SDK oficial de Google utiliza 'GoogleGenAI'
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Inicialización del cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`¡Conectado exitosamente como ${client.user.tag}!`);
});

// 4. Lógica para procesar los mensajes y responder con IA
client.on('messageCreate', async (message) => {
    // Ignorar mensajes que vengan de otros bots o del propio bot
    if (message.author.bot) return;

    // El bot responderá solo si lo mencionan directamete (@Bot)
    if (message.mentions.has(client.user)) {
        try {
            // Mostrar estado "escribiendo..." en el canal de Discord
            await message.channel.sendTyping();

            // Limpiar la mención del texto para enviar solo la pregunta limpia a la IA
            const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();

            if (!prompt) {
                return message.reply("¡Hola! ¿En qué te puedo ayudar hoy?");
            }

            // Llamada a la API de Google con el modelo corregido
            const response = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
            });

            // Enviar la respuesta generada de vuelta a Discord
            await message.reply(response.text);

        } catch (error) {
            console.error("Error al procesar la IA:", error);
            await message.reply("❌ Lo siento, tuve un problema interno al procesar tu solicitud.");
        }
    }
});

// 5. Autenticación del bot con el token de Discord
client.login(process.env.DISCORD_TOKEN);



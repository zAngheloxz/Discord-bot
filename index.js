const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Lista de palabras prohibidas (puedes añadir las que quieras aquí)
const palabrasProhibidas = ['tonto', 'bobo', 'pendejo', 'mierda']; 

client.once('ready', () => {
    console.log(`¡Bot Moderador encendido como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. FILTRO DE PALABRAS PROHIBIDAS
    const contieneGroseria = palabrasProhibidas.some(palabra => message.content.toLowerCase().includes(palabra));
    if (contieneGroseria) {
        try {
            await message.delete();
            return message.channel.send(`⚠️ ${message.author}, ¡cuida tu lenguaje! No se permiten groserías aquí.`);
        } catch (err) { console.error('Error al borrar grosería:', err); }
    }

    // 2. ANTI-SPAM DE ENLACES (Permite links solo a administradores)
    const tieneLink = /(https?:\/\/[^\s]+)/g.test(message.content);
    if (tieneLink && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try {
            await message.delete();
            return message.channel.send(`🚫 ${message.author}, no tienes permiso para enviar enlaces en este servidor.`);
        } catch (err) { console.error('Error al borrar enlace:', err); }
    }

    // 3. ANTI-MAYÚSCULAS (Borra si el mensaje tiene más de 5 letras y el 80% son mayúsculas)
    if (message.content.length > 5) {
        const mayusculas = message.content.replace(/[^A-Z]/g, "").length;
        const porcentaje = mayusculas / message.content.length;
        if (porcentaje > 0.8 && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            try {
                await message.delete();
                return message.channel.send(`🤫 ${message.author}, por favor no grites (evita usar demasiadas mayúsculas).`);
            } catch (err) { console.error('Error al borrar mayúsculas:', err); }
        }
    }

    // 4. COMANDO MANUAL: !kick @usuario (Solo para Administradores)
    if (message.content.startsWith('!kick')) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ No tienes permisos para usar este comando.');
        }

        const miembro = message.mentions.members.first();
        if (!miembro) return message.reply('Debes mencionar a un usuario. Ejemplo: `!kick @usuario`');
        if (!miembro.kickable) return message.reply('No puedo expulsar a este usuario (puede que tenga un rol más alto que el mío).');

        try {
            await miembro.kick();
            message.channel.send(`🚨 **${miembro.user.tag}** ha sido expulsado del servidor.`);
        } catch (err) {
            message.reply('Hubo un error al intentar expulsar al usuario.');
            console.error(err);
        }
    }
});

// Servidor web falso para Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot activo\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    client.login(process.env.DISCORD_TOKEN);
});


const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

// ==================================================
// CONFIGURACIÓN
// ==================================================

const TOKEN = "MTU0Mjk4NDAwMzUxNzE1MzM1MA.G2cp1f.sBvOR-SLi1V316sbxyO3piuMs3QU_F2x0IS_VA";
const GUILD_ID = "1546409430503915572";

// ID de la categoría donde quieres que se creen los tickets.
// Si no quieres usar una categoría concreta, déjalo como "".
const TICKET_CATEGORY_ID = "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==================================================
// AUTOMOD
// ==================================================

// Añade aquí las palabras que quieras bloquear.
const BAD_WORDS = [
 "Puta",
  "subnormal",
  "Manco"
];

// Detecta enlaces.
const LINK_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+)/i;

// Guarda las infracciones mientras el bot está encendido.
const warnings = new Map();

// ==================================================
// FUNCIONES
// ==================================================

function contienePalabraProhibida(texto) {
  const textoNormalizado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return BAD_WORDS.some((palabra) => {
    const palabraNormalizada = palabra
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return textoNormalizado.includes(palabraNormalizada);
  });
}

function esModerador(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.ModerateMembers
  ) || member.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  );
}

function sumarInfraccion(guildId, userId) {
  const key = `${guildId}:${userId}`;

  const cantidad = (warnings.get(key) || 0) + 1;

  warnings.set(key, cantidad);

  return cantidad;
}

// ==================================================
// COMANDOS
// ==================================================

const commands = [

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario que quieres banear.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("razon")
        .setDescription("Razón del baneo.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa a un usuario.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario que quieres expulsar.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("razon")
        .setDescription("Razón.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Aplica un timeout.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario.")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutos")
        .setDescription("Duración del timeout.")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("razon")
        .setDescription("Razón.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Quita el timeout.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Advierte a un usuario.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("razon")
        .setDescription("Razón.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Borra mensajes.")
    .addIntegerOption(option =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de mensajes.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  // =========================
  // MINIJUEGOS
  // =========================

  new SlashCommandBuilder()
    .setName("dado")
    .setDescription("Lanza un dado."),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Lanza una moneda."),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Pregunta a la bola mágica.")
    .addStringOption(option =>
      option
        .setName("pregunta")
        .setDescription("Tu pregunta.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Juega piedra, papel o tijera.")
    .addStringOption(option =>
      option
        .setName("eleccion")
        .setDescription("Tu elección.")
        .setRequired(true)
        .addChoices(
          { name: "Piedra", value: "piedra" },
          { name: "Papel", value: "papel" },
          { name: "Tijera", value: "tijera" }
        )
    ),

  // =========================
  // TICKETS
  // =========================

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Envía el panel de tickets.")

].map(command => command.toJSON());

// ==================================================
// BOT ENCENDIDO
// ==================================================

client.once("ready", async () => {

  console.log(`=================================`);
  console.log(`✅ Catby17 conectado`);
  console.log(`🤖 Usuario: ${client.user.tag}`);
  console.log(`=================================`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log("✅ Comandos registrados correctamente.");

  } catch (error) {

    console.error("❌ Error registrando comandos:");
    console.error(error);

  }

});

// ==================================================
// AUTOMOD
// ==================================================

client.on("messageCreate", async message => {

  if (!message.guild) return;
  if (message.author.bot) return;

  // Los moderadores pueden saltarse el AutoMod.
  if (
    message.member &&
    message.member.permissions.has(
      PermissionsBitField.Flags.ManageMessages
    )
  ) {
    return;
  }

  let motivo = null;

  if (LINK_REGEX.test(message.content)) {

    motivo = "enlace no permitido";

  } else if (contienePalabraProhibida(message.content)) {

    motivo = "lenguaje inapropiado";

  }

  if (!motivo) return;

  try {
    await message.delete();
  } catch {}

  const infracciones = sumarInfraccion(
    message.guild.id,
    message.author.id
  );

  let mensaje;

  // 3 infracciones = timeout
  if (infracciones >= 3) {

    if (message.member && message.member.moderatable) {

      try {

        await message.member.timeout(
          10 * 60 * 1000,
          "3 infracciones del AutoMod"
        );

        warnings.set(
          `${message.guild.id}:${message.author.id}`,
          0
        );

        mensaje =
          `🚨 ${message.author}, has recibido un **timeout de 10 minutos** por acumular 3 infracciones del AutoMod.`;

      } catch {

        mensaje =
          `⚠️ ${message.author}, has alcanzado 3 infracciones, pero no pude aplicar el timeout.`;

      }

    } else {

      mensaje =
        `⚠️ ${message.author}, has alcanzado 3 infracciones del AutoMod.`;

    }

  } else {

    mensaje =
      `⚠️ ${message.author}, tu mensaje fue eliminado por **${motivo}**.\n` +
      `Infracciones: **${infracciones}/3**`;

  }

  const aviso = await message.channel
    .send(mensaje)
    .catch(() => null);

  if (aviso) {

    setTimeout(() => {

      aviso.delete().catch(() => {});

    }, 6000);

  }

});

// ==================================================
// INTERACCIONES
// ==================================================

client.on("interactionCreate", async interaction => {

  try {

    // ==================================================
    // SLASH COMMANDS
    // ==================================================

    if (interaction.isChatInputCommand()) {

      const command = interaction.commandName;

      // ==================================================
      // BAN
      // ==================================================

      if (command === "ban") {

        if (!esModerador(interaction.member)) {

          return interaction.reply({
            content: "❌ No tienes permisos para usar este comando.",
            ephemeral: true
          });

        }

        const user =
          interaction.options.getUser("usuario");

        const razon =
          interaction.options.getString("razon") ||
          "Sin razón especificada.";

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {

          return interaction.reply({
            content: "❌ No encontré a ese usuario.",
            ephemeral: true
          });

        }

        if (!member.bannable) {

          return interaction.reply({
            content:
              "❌ No puedo banear a ese usuario. Revisa la posición de mis roles.",
            ephemeral: true
          });

        }

        await member.ban({
          reason: razon
        });

        return interaction.reply(
          `🔨 **${user.tag}** ha sido baneado.\n> Razón: ${razon}`
        );

      }

      // ==================================================
      // KICK
      // ==================================================

      if (command === "kick") {

        if (!esModerador(interaction.member)) {

          return interaction.reply({
            content: "❌ No tienes permisos.",
            ephemeral: true
          });

        }

        const user =
          interaction.options.getUser("usuario");

        const razon =
          interaction.options.getString("razon") ||
          "Sin razón especificada.";

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.kickable) {

          return interaction.reply({
            content: "❌ No puedo expulsar a ese usuario.",
            ephemeral: true
          });

        }

        await member.kick(razon);

        return interaction.reply(
          `👢 **${user.tag}** ha sido expulsado.\n> Razón: ${razon}`
        );

      }

      // ==================================================
      // TIMEOUT
      // ==================================================

      if (command === "timeout") {

        if (!esModerador(interaction.member)) {

          return interaction.reply({
            content: "❌ No tienes permisos.",
            ephemeral: true
          });

        }

        const user =
          interaction.options.getUser("usuario");

        const minutos =
          interaction.options.getInteger("minutos");

        const razon =
          interaction.options.getString("razon") ||
          "Sin razón especificada.";

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.moderatable) {

          return interaction.reply({
            content: "❌ No puedo aplicar timeout a ese usuario.",
            ephemeral: true
          });

        }

        await member.timeout(
          minutos * 60 * 1000,
          razon
        );

        return interaction.reply(
          `⏳ **${user.tag}** recibió timeout durante **${minutos} minutos**.\n> Razón: ${razon}`
        );

      }

      // ==================================================
      // UNTIMEOUT
      // ==================================================

      if (command === "untimeout") {

        if (!esModerador(interaction.member)) {

          return interaction.reply({
            content: "❌ No tienes permisos.",
            ephemeral: true
          });

        }

        const user =
          interaction.options.getUser("usuario");

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.moderatable) {

          return interaction.reply({
            content: "❌ No puedo quitarle el timeout.",
            ephemeral: true
          });

        }

        await member.timeout(null);

        return interaction.reply(
          `✅ Timeout retirado a **${user.tag}**.`
        );

      }

      // ==================================================
      // WARN
      // ==================================================

      if (command === "warn") {

        if (!esModerador(interaction.member)) {

          return interaction.reply({
            content: "❌ No tienes permisos.",
            ephemeral: true
          });

        }

        const user =
          interaction.options.getUser("usuario");

        const razon =
          interaction.options.getString("razon") ||
          "Sin razón especificada.";

        const cantidad =
          sumarInfraccion(
            interaction.guild.id,
            user.id
          );

        let texto =
          `⚠️ **${user.tag}** recibió una advertencia.\n` +
          `> Razón: ${razon}\n` +
          `> Advertencias: **${cantidad}/3**`;

        if (cantidad >= 3) {

          const member =
            await interaction.guild.members
              .fetch(user.id)
              .catch(() => null);

          if (member && member.moderatable) {

            await member.timeout(
              10 * 60 * 1000,
              "3 advertencias"
            );

            warnings.set(
              `${interaction.guild.id}:${user.id}`,
              0
            );

            texto +=
              `\n⏳ Se aplicó un **timeout de 10 minutos**.`;

          }

        }

        return interaction.reply(texto);

      }

      // ==================================================
      // CLEAR
      // ==================================================

      if (command === "clear") {

        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.ManageMessages
          )
        ) {

          return interaction.reply({
            content: "❌ No tienes permisos.",
            ephemeral: true
          });

        }

        const cantidad =
          interaction.options.getInteger("cantidad");

        const mensajes =
          await interaction.channel.bulkDelete(
            cantidad,
            true
          );

        return interaction.reply({
          content:
            `🧹 He borrado **${mensajes.size} mensajes**.`,
          ephemeral: true
        });

      }

      // ==================================================
      // DADO
      // ==================================================

      if (command === "dado") {

        const numero =
          Math.floor(Math.random() * 6) + 1;

        return interaction.reply(
          `🎲 **${interaction.user.username}** ha sacado un **${numero}**.`
        );

      }

      // ==================================================
      // COINFLIP
      // ==================================================

      if (command === "coinflip") {

        const resultado =
          Math.random() < 0.5
            ? "Cara"
            : "Cruz";

        return interaction.reply(
          `🪙 Ha salido **${resultado}**.`
        );

      }

      // ==================================================
      // 8BALL
      // ==================================================

      if (command === "8ball") {

        const respuestas = [
          "🎱 Sí.",
          "🎱 No.",
          "🎱 Probablemente.",
          "🎱 Definitivamente.",
          "🎱 No creo.",
          "🎱 Puede ser.",
          "🎱 Pregúntame más tarde.",
          "🎱 Las estrellas dicen que sí."
        ];

        const respuesta =
          respuestas[
            Math.floor(
              Math.random() * respuestas.length
            )
          ];

        return interaction.reply(respuesta);

      }

      // ==================================================
      // RPS
      // ==================================================

      if (command === "rps") {

        const usuario =
          interaction.options.getString("eleccion");

        const opciones = [
          "piedra",
          "papel",
          "tijera"
        ];

        const bot =
          opciones[
            Math.floor(
              Math.random() * opciones.length
            )
          ];

        let resultado;

        if (usuario === bot) {

          resultado = "🤝 ¡Empate!";

        } else if (
          (usuario === "piedra" && bot === "tijera") ||
          (usuario === "papel" && bot === "piedra") ||
          (usuario === "tijera" && bot === "papel")
        ) {

          resultado = "🏆 ¡Ganaste!";

        } else {

          resultado = "😎 ¡He ganado!";

        }

        return interaction.reply(
          `🎮 Tú: **${usuario}**\n` +
          `🤖 Catby17: **${bot}**\n\n` +
          resultado
        );

      }

      // ==================================================
      // PANEL DE TICKETS
      // ==================================================

      if (command === "ticket") {

        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.ManageChannels
          )
        ) {

          return interaction.reply({
            content:
              "❌ Necesitas el permiso de gestionar canales.",
            ephemeral: true
          });

        }

        const embed =
          new EmbedBuilder()
            .setTitle("🎫 CATBY17 | TICKETS")
            .setDescription(
              "¿Necesitas ayuda?\n\n" +
              "Selecciona una categoría en el menú de abajo para abrir un ticket.\n\n" +
              "🛠️ **Soporte**\n" +
              "💰 **Compras / Tienda**\n" +
              "🚨 **Reportes**\n" +
              "⚖️ **Apelaciones**\n" +
              "❓ **Otros**"
            )
            .setFooter({
              text: "Catby17 • Sistema de Tickets"
            });

        const menu =
          new StringSelectMenuBuilder()
            .setCustomId("ticket_categoria")
            .setPlaceholder(
              "Selecciona una categoría..."
            )
            .addOptions(
              {
                label: "Soporte",
                description: "Ayuda general.",
                value: "soporte",
                emoji: "🛠️"
              },
              {
                label: "Compras / Tienda",
                description: "Problemas con compras.",
                value: "compras",
                emoji: "💰"
              },
              {
                label: "Reportes",
                description: "Reporta a un usuario.",
                value: "reportes",
                emoji: "🚨"
              },
              {
                label: "Apelaciones",
                description: "Apela una sanción.",
                value: "apelaciones",
                emoji: "⚖️"
              },
              {
                label: "Otros",
                description: "Otra consulta.",
                value: "otros",
                emoji: "❓"
              }
            );

        const row =
          new ActionRowBuilder()
            .addComponents(menu);

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });

      }

    }

    // ==================================================
    // CREAR TICKET
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_categoria"
    ) {

      const categoria =
        interaction.values[0];

      const nombres = {
        soporte: "soporte",
        compras: "compras",
        reportes: "reportes",
        apelaciones: "apelaciones",
        otros: "otros"
      };

      // Evita que una persona tenga varios tickets.
      const ticketExistente =
        interaction.guild.channels.cache.find(
          channel =>
            channel.type === ChannelType.GuildText &&
            channel.topic ===
              `ticket:${interaction.user.id}`
        );

      if (ticketExistente) {

        return interaction.reply({
          content:
            `❌ Ya tienes un ticket abierto: ${ticketExistente}`,
          ephemeral: true
        });

      }

      const permisos = [

        {
          id: interaction.guild.roles.everyone.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
        },

        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }

      ];

      // Permisos para el bot.
      if (interaction.guild.members.me) {

        permisos.push({
          id: interaction.guild.members.me.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });

      }

      const canal =
        await interaction.guild.channels.create({

          name:
            `ticket-${nombres[categoria]}-${interaction.user.username}`
              .slice(0, 90),

          type: ChannelType.GuildText,

          topic:
            `ticket:${interaction.user.id}`,

          parent:
            TICKET_CATEGORY_ID || undefined,

          permissionOverwrites:
            permisos

        });

      const cerrar =
        new ButtonBuilder()
          .setCustomId("cerrar_ticket")
          .setLabel("Cerrar ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger);

      const fila =
        new ActionRowBuilder()
          .addComponents(cerrar);

      const embed =
        new EmbedBuilder()
          .setTitle("🎫 Ticket creado")
          .setDescription(
            `Hola ${interaction.user} 👋\n\n` +
            `Tu ticket de **${nombres[categoria]}** ha sido creado.\n\n` +
            `Explica tu problema con todos los detalles posibles y espera a que un miembro del staff te atienda.`
          )
          .setFooter({
            text: "Catby17 • Soporte"
          });

      await canal.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [fila]
      });

      return interaction.reply({
        content:
          `✅ Ticket creado correctamente: ${canal}`,
        ephemeral: true
      });

    }

    // ==================================================
    // CERRAR TICKET
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId === "cerrar_ticket"
    ) {

      if (
        !interaction.channel ||
        !interaction.channel.name.startsWith("ticket-")
      ) {

        return interaction.reply({
          content:
            "❌ Este canal no es un ticket.",
          ephemeral: true
        });

      }

      await interaction.reply(
        "🔒 Este ticket se cerrará en **5 segundos**."
      );

      setTimeout(() => {

        interaction.channel
          .delete()
          .catch(() => {});

      }, 5000);

    }

  } catch (error) {

    console.error(
      "❌ Error en una interacción:",
      error
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {

      interaction.reply({
        content:
          "❌ Ha ocurrido un error. Revisa la consola de Render.",
        ephemeral: true
      }).catch(() => {});

    }

  }

});

// ==================================================
// CONEXIÓN
// ==================================================

if (
  TOKEN === "MTU0Mjk4NDAwMzUxNzE1MzM1MA.G2cp1f.sBvOR-SLi1V316sbxyO3piuMs3QU_F2x0IS_VA"
) {

  console.error(
    "❌ ERROR: todavía no has puesto el token del bot."
  );

  process.exit(1);

}

client.login(TOKEN);
```

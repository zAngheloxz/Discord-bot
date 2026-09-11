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

// ================= CONFIG =================
const TOKEN = "MTU0Mjk4NDAwMzUxNzE1MzM1MA.G2cp1f.sBvOR-SLi1V316sbxyO3piuMs3QU_F2x0IS_VA";
const GUILD_ID = "1546409430503915572";

// Opcionales:
const TICKET_CATEGORY_ID = "1547879527785566248";
const STAFF_ROLE_ID = "1546413722023493633";

// Cambia/añade las palabras que quieras bloquear.
const BAD_WORDS = ["puta", "manco", "subnormal"];

const LINK_REGEX =
  /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)[^\s]+/i;

const warnings = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= HELPERS =================
function isModerator(member) {
  return member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
         member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

function hasBadWord(text) {
  const normalized = text.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return BAD_WORDS.some(word => {
    const w = word.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return normalized.includes(w);
  });
}

function addWarning(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const value = (warnings.get(key) || 0) + 1;
  warnings.set(key, value);
  return value;
}

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder().setName("ban").setDescription("Banea a un usuario.")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario.").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón.")),

  new SlashCommandBuilder().setName("kick").setDescription("Expulsa a un usuario.")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario.").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón.")),

  new SlashCommandBuilder().setName("timeout").setDescription("Aplica timeout.")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario.").setRequired(true))
    .addIntegerOption(o => o.setName("minutos").setDescription("Minutos.").setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón.")),

  new SlashCommandBuilder().setName("untimeout").setDescription("Quita un timeout.")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario.").setRequired(true)),

  new SlashCommandBuilder().setName("warn").setDescription("Advierte a un usuario.")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario.").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón.")),

  new SlashCommandBuilder().setName("clear").setDescription("Borra mensajes.")
    .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad (1-100).").setMinValue(1).setMaxValue(100).setRequired(true)),

  new SlashCommandBuilder().setName("dado").setDescription("Lanza un dado."),

  new SlashCommandBuilder().setName("coinflip").setDescription("Lanza una moneda."),

  new SlashCommandBuilder().setName("8ball").setDescription("Pregunta a la bola mágica.")
    .addStringOption(o => o.setName("pregunta").setDescription("Pregunta.").setRequired(true)),

  new SlashCommandBuilder().setName("rps").setDescription("Piedra, papel o tijera.")
    .addStringOption(o => o.setName("eleccion").setDescription("Elección.").setRequired(true)
      .addChoices(
        { name: "Piedra", value: "piedra" },
        { name: "Papel", value: "papel" },
        { name: "Tijera", value: "tijera" }
      )),

  new SlashCommandBuilder().setName("ticket").setDescription("Envía el panel de tickets.")
].map(c => c.toJSON());

// ================= READY =================
client.once("ready", async () => {
  console.log(`🐱 Catby17 conectado como ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados.");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
});

// ================= AUTOMOD =================
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  // Staff con Manage Messages queda excluido del AutoMod.
  if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

  let reason = null;
  if (LINK_REGEX.test(message.content)) reason = "enlace no permitido";
  else if (hasBadWord(message.content)) reason = "lenguaje inapropiado";
  if (!reason) return;

  await message.delete().catch(() => {});

  const count = addWarning(message.guild.id, message.author.id);
  let text;

  if (count >= 3) {
    if (message.member?.moderatable) {
      await message.member.timeout(10 * 60 * 1000, "3 infracciones del AutoMod")
        .then(() => {
          warnings.set(`${message.guild.id}:${message.author.id}`, 0);
          text = `🚨 ${message.author}, has recibido **10 minutos de timeout** por 3 infracciones del AutoMod.`;
        })
        .catch(() => {
          text = `⚠️ ${message.author}, alcanzaste 3 infracciones, pero no pude aplicar el timeout.`;
        });
    } else {
      text = `⚠️ ${message.author}, alcanzaste 3 infracciones del AutoMod.`;
    }
  } else {
    text = `⚠️ ${message.author}, mensaje eliminado por **${reason}**.\nInfracciones: **${count}/3**`;
  }

  const sent = await message.channel.send(text).catch(() => null);
  if (sent) setTimeout(() => sent.delete().catch(() => {}), 6000);
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      // ----- MODERATION -----
      if (["ban", "kick", "timeout", "untimeout", "warn"].includes(cmd)) {
        if (!isModerator(interaction.member)) {
          return interaction.reply({ content: "❌ No tienes permisos.", ephemeral: true });
        }
      }

      if (cmd === "ban") {
        const user = interaction.options.getUser("usuario");
        const reason = interaction.options.getString("razon") || "Sin razón especificada.";
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: "❌ No encontré a ese usuario.", ephemeral: true });
        if (!member.bannable) return interaction.reply({ content: "❌ No puedo banear a ese usuario. Revisa mis roles.", ephemeral: true });
        await member.ban({ reason });
        return interaction.reply(`🔨 **${user.tag}** ha sido baneado.\n> ${reason}`);
      }

      if (cmd === "kick") {
        const user = interaction.options.getUser("usuario");
        const reason = interaction.options.getString("razon") || "Sin razón especificada.";
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member?.kickable) return interaction.reply({ content: "❌ No puedo expulsar a ese usuario.", ephemeral: true });
        await member.kick(reason);
        return interaction.reply(`👢 **${user.tag}** ha sido expulsado.\n> ${reason}`);
      }

      if (cmd === "timeout") {
        const user = interaction.options.getUser("usuario");
        const minutes = interaction.options.getInteger("minutos");
        const reason = interaction.options.getString("razon") || "Sin razón especificada.";
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member?.moderatable) return interaction.reply({ content: "❌ No puedo aplicar timeout.", ephemeral: true });
        await member.timeout(minutes * 60000, reason);
        return interaction.reply(`⏳ **${user.tag}** recibió timeout de **${minutes} minutos**.\n> ${reason}`);
      }

      if (cmd === "untimeout") {
        const user = interaction.options.getUser("usuario");
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member?.moderatable) return interaction.reply({ content: "❌ No puedo quitar el timeout.", ephemeral: true });
        await member.timeout(null);
        return interaction.reply(`✅ Timeout retirado a **${user.tag}**.`);
      }

      if (cmd === "warn") {
        const user = interaction.options.getUser("usuario");
        const reason = interaction.options.getString("razon") || "Sin razón especificada.";
        const count = addWarning(interaction.guild.id, user.id);
        let text = `⚠️ **${user.tag}** recibió un warn.\n> ${reason}\n> Warns: **${count}/3**`;

        if (count >= 3) {
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (member?.moderatable) {
            await member.timeout(10 * 60000, "3 advertencias");
            warnings.set(`${interaction.guild.id}:${user.id}`, 0);
            text += "\n⏳ Se aplicaron **10 minutos de timeout**.";
          }
        }
        return interaction.reply(text);
      }

      if (cmd === "clear") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          return interaction.reply({ content: "❌ No tienes permisos.", ephemeral: true });
        }
        const amount = interaction.options.getInteger("cantidad");
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({ content: `🧹 Borrados **${deleted.size} mensajes**.`, ephemeral: true });
      }

      // ----- MINIGAMES -----
      if (cmd === "dado") {
        return interaction.reply(`🎲 Has sacado un **${Math.floor(Math.random() * 6) + 1}**.`);
      }

      if (cmd === "coinflip") {
        return interaction.reply(`🪙 Ha salido **${Math.random() < 0.5 ? "Cara" : "Cruz"}**.`);
      }

      if (cmd === "8ball") {
        const answers = [
          "🎱 Sí.", "🎱 No.", "🎱 Probablemente.", "🎱 Puede ser.",
          "🎱 Definitivamente.", "🎱 No creo.", "🎱 Pregúntame más tarde."
        ];
        return interaction.reply(answers[Math.floor(Math.random() * answers.length)]);
      }

      if (cmd === "rps") {
        const user = interaction.options.getString("eleccion");
        const choices = ["piedra", "papel", "tijera"];
        const bot = choices[Math.floor(Math.random() * 3)];

        let result = "🤝 ¡Empate!";
        if (
          (user === "piedra" && bot === "tijera") ||
          (user === "papel" && bot === "piedra") ||
          (user === "tijera" && bot === "papel")
        ) result = "🏆 ¡Ganaste!";
        else if (user !== bot) result = "😎 ¡He ganado!";

        return interaction.reply(`🎮 Tú: **${user}**\n🤖 Catby17: **${bot}**\n\n${result}`);
      }

      // ----- TICKET PANEL -----
      if (cmd === "ticket") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
          return interaction.reply({ content: "❌ Necesitas gestionar canales.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle("🎫 CATBY17 | TICKETS")
          .setDescription(
            "Selecciona una categoría para abrir un ticket.\n\n" +
            "🛠️ **Soporte**\n💰 **Compras / Tienda**\n🚨 **Reportes**\n" +
            "⚖️ **Apelaciones**\n❓ **Otros**"
          )
          .setFooter({ text: "Catby17 • Sistema de Tickets" });

        const menu = new StringSelectMenuBuilder()
          .setCustomId("ticket_categoria")
          .setPlaceholder("Selecciona una categoría...")
          .addOptions(
            { label: "Soporte", description: "Ayuda general.", value: "soporte", emoji: "🛠️" },
            { label: "Compras / Tienda", description: "Problemas con compras.", value: "compras", emoji: "💰" },
            { label: "Reportes", description: "Reporta a un usuario.", value: "reportes", emoji: "🚨" },
            { label: "Apelaciones", description: "Apela una sanción.", value: "apelaciones", emoji: "⚖️" },
            { label: "Otros", description: "Otra consulta.", value: "otros", emoji: "❓" }
          );

        return interaction.reply({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(menu)]
        });
      }
    }

    // ----- TICKET CREATION -----
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_categoria") {
      const category = interaction.values[0];
      const existing = interaction.guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.topic === `ticket:${interaction.user.id}`
      );

      if (existing) {
        return interaction.reply({ content: `❌ Ya tienes un ticket abierto: ${existing}`, ephemeral: true });
      }

      const permissions = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
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

      if (STAFF_ROLE_ID) {
        permissions.push({
          id: STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      permissions.push({
        id: interaction.guild.members.me.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });

      const channel = await interaction.guild.channels.create({
        name: `ticket-${category}-${interaction.user.username}`.slice(0, 90),
        type: ChannelType.GuildText,
        topic: `ticket:${interaction.user.id}`,
        parent: TICKET_CATEGORY_ID || undefined,
        permissionOverwrites: permissions
      });

      const close = new ButtonBuilder()
        .setCustomId("cerrar_ticket")
        .setLabel("Cerrar ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket • ${category}`)
        .setDescription(
          `Hola ${interaction.user} 👋\n\n` +
          `Tu ticket de **${category}** ha sido creado.\n` +
          "Explica tu problema y espera al staff."
        )
        .setFooter({ text: "Catby17 • Soporte" });

      await channel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(close)]
      });

      return interaction.reply({
        content: `✅ Ticket creado: ${channel}`,
        ephemeral: true
      });
    }

    // ----- CLOSE TICKET -----
    if (interaction.isButton() && interaction.customId === "cerrar_ticket") {
      if (!interaction.channel?.name.startsWith("ticket-")) {
        return interaction.reply({ content: "❌ Este canal no es un ticket.", ephemeral: true });
      }

      await interaction.reply("🔒 Cerrando ticket en **5 segundos**...");
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ocurrió un error. Revisa los logs de Render.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ================= LOGIN =================
if (TOKEN === "MTU0Mjk4NDAwMzUxNzE1MzM1MA.G2cp1f.sBvOR-SLi1V316sbxyO3piuMs3QU_F2x0IS_VA") {
  console.error("❌ Pon el token del bot en index.js.");
  process.exit(1);
}

if (GUILD_ID === "1546409430503915572") {
  console.error("❌ Pon el ID del servidor en index.js.");
  process.exit(1);
}

client.login(TOKEN);

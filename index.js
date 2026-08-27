const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ⚠️ Put YOUR real Discord server ID here (same one you already used before).
const GUILD_ID = '1530186411179769897';

const commands = [
  new SlashCommandBuilder()
    .setName('bulkroles')
    .setDescription('Bulk create roles with colors')
    .addStringOption(option =>
      option
        .setName('list')
        .setDescription('Name | #HEX | after:ExistingRole (optional)')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('Slash command registered instantly for the server.');
  } catch (err) {
    console.error('Failed to register slash command:', err);
  }
});

function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{6})$/.test(hex);
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'bulkroles') return;

  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'You need the **Manage Roles** permission to use this command.',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'I need the **Manage Roles** permission to create roles.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const raw = interaction.options.getString('list');
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const created = []; // { role, anchorName }
  const failed = [];
  let currentAnchor = null; // "sticky" anchor — carries forward until changed or reset

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 2 || parts.length > 3) {
      failed.push(`"${line}" — invalid format (expected: Name | #HEX or Name | #HEX | after:RoleName)`);
      continue;
    }
    const name = parts[0];
    const color = parts[1];

    if (parts[2]) {
      const afterMatch = parts[2].match(/^after:\s*(.+)$/i);
      if (afterMatch) {
        const value = afterMatch[1].trim();
        // "after:none" / "after:bottom" resets back to placing at the very bottom
        currentAnchor = /^(none|bottom|end)$/i.test(value) ? null : value;
      } else {
        failed.push(`"${line}" — invalid third field (use after:RoleName)`);
        continue;
      }
    }
    // If no third field given, this line inherits whatever anchor was last set (sticky)
    const anchorName = currentAnchor;

    if (!name) {
      failed.push(`"${line}" — missing role name`);
      continue;
    }
    if (!isValidHex(color)) {
      failed.push(`"${line}" — invalid hex color`);
      continue;
    }

    try {
      const role = await interaction.guild.roles.create({
        name,
        color,
        hoist: true,
        mentionable: true,
        reason: `Bulk role creation by ${interaction.user.tag}`
      });
      created.push({ role, anchorName });
    } catch (err) {
      failed.push(`"${line}" — Discord error: ${err.message}`);
    }
  }

  // Reposition: insert each created role right below its named anchor role (if given),
  // otherwise place it at the very bottom of the hierarchy (above @everyone).
  if (created.length > 0) {
    try {
      await interaction.guild.roles.fetch(); // refresh cache
      const everyoneId = interaction.guild.id;
      const createdIds = new Set(created.map(c => c.role.id));

      // Existing hierarchy (excluding @everyone and the roles we just made), highest first
      const order = [...interaction.guild.roles.cache.values()]
        .filter(r => r.id !== everyoneId && !createdIds.has(r.id))
        .sort((a, b) => b.position - a.position);

      const anchoredGroups = new Map(); // anchorRoleId -> [roles in input order]
      const bottomGroup = [];

      for (const { role, anchorName } of created) {
        if (anchorName) {
          const anchorRole = order.find(r => r.name.toLowerCase() === anchorName.toLowerCase());
          if (!anchorRole) {
            failed.push(`"${role.name}" — anchor role "${anchorName}" not found, placed at the bottom instead`);
            bottomGroup.push(role);
            continue;
          }
          if (!anchoredGroups.has(anchorRole.id)) anchoredGroups.set(anchorRole.id, []);
          anchoredGroups.get(anchorRole.id).push(role);
        } else {
          bottomGroup.push(role);
        }
      }

      // Walk existing roles top -> bottom, inserting anchored groups right after their anchor
      const final = [];
      for (const r of order) {
        final.push(r);
        if (anchoredGroups.has(r.id)) {
          final.push(...anchoredGroups.get(r.id));
        }
      }
      // Roles with no anchor go at the very bottom (just above @everyone)
      final.push(...bottomGroup);

      const total = final.length;
      const positions = final.map((r, index) => ({
        role: r.id,
        position: total - index
      }));

      await interaction.guild.roles.setPositions(positions);
    } catch (err) {
      failed.push(
        `Hierarchy ordering step failed: ${err.message} (roles were created, but order may need manual fixing)`
      );
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Bulk Role Creation Results')
    .setColor(created.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      {
        name: '✅ Created',
        value: created.length > 0 ? created.map(c => c.role.name).join('\n').slice(0, 1024) : 'None',
        inline: true
      },
      {
        name: '❌ Failed / Notes',
        value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'None',
        inline: true
      }
    )
    .setFooter({ text: `${created.length} succeeded, ${failed.length} issues` });

  await interaction.editReply({ embeds: [embed] });
});

client.login(process.env.TOKEN);

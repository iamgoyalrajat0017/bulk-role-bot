const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

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
    ),
  new SlashCommandBuilder()
    .setName('bulkdeleteroles')
    .setDescription('Bulk delete roles by name')
    .addStringOption(option =>
      option
        .setName('list')
        .setDescription('Role names, one per line (exact names)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('deleteallroles')
    .setDescription('Delete ALL deletable roles in this server')
    .addStringOption(option =>
      option
        .setName('confirm')
        .setDescription('Type CONFIRM to proceed')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('listbots')
    .setDescription('List all bots currently in this server'),
  new SlashCommandBuilder()
    .setName('kickbots')
    .setDescription('Kick one or more bots by name')
    .addStringOption(option =>
      option
        .setName('list')
        .setDescription('Bot names, one per line (exact username, without the #tag)')
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
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'bulkroles') return handleBulkRoles(interaction);
  if (interaction.commandName === 'bulkdeleteroles') return handleBulkDeleteRoles(interaction);
  if (interaction.commandName === 'deleteallroles') return handleDeleteAllRoles(interaction);
  if (interaction.commandName === 'listbots') return handleListBots(interaction);
  if (interaction.commandName === 'kickbots') return handleKickBots(interaction);
});

async function handleBulkRoles(interaction) {

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
}

async function handleBulkDeleteRoles(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'You need the **Manage Roles** permission to use this command.',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'I need the **Manage Roles** permission to delete roles.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const raw = interaction.options.getString('list');
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  await interaction.guild.roles.fetch(); // refresh cache

  const deleted = [];
  const failed = [];

  for (const line of lines) {
    const name = line.replace(/\|.*/, '').trim(); // ignore anything after a | if pasted by mistake
    if (!name) {
      failed.push(`"${line}" — empty role name`);
      continue;
    }

    const role = interaction.guild.roles.cache.find(
      r => r.name.toLowerCase() === name.toLowerCase()
    );

    if (!role) {
      failed.push(`"${name}" — role not found`);
      continue;
    }
    if (role.id === interaction.guild.id) {
      failed.push(`"${name}" — cannot delete @everyone`);
      continue;
    }
    if (role.managed) {
      failed.push(`"${name}" — managed by an integration/bot, can't delete`);
      continue;
    }
    if (botMember.roles.highest.position <= role.position) {
      failed.push(`"${name}" — this role is above my highest role, can't delete`);
      continue;
    }

    try {
      await role.delete(`Bulk role deletion by ${interaction.user.tag}`);
      deleted.push(name);
    } catch (err) {
      failed.push(`"${name}" — Discord error: ${err.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Bulk Role Deletion Results')
    .setColor(deleted.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      {
        name: '✅ Deleted',
        value: deleted.length > 0 ? deleted.join('\n').slice(0, 1024) : 'None',
        inline: true
      },
      {
        name: '❌ Failed',
        value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'None',
        inline: true
      }
    )
    .setFooter({ text: `${deleted.length} succeeded, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}

client.login(process.env.TOKEN);

async function handleDeleteAllRoles(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'You need the **Manage Roles** permission to use this command.',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'I need the **Manage Roles** permission to delete roles.',
      ephemeral: true
    });
  }

  const confirm = interaction.options.getString('confirm');
  if (confirm !== 'CONFIRM') {
    return interaction.reply({
      content: '⚠️ This deletes every deletable role in the server. Run again with `confirm: CONFIRM` (all caps) if you\'re sure.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  await interaction.guild.roles.fetch(); // refresh cache

  const everyoneId = interaction.guild.id;
  const rolesToDelete = interaction.guild.roles.cache.filter(
    r =>
      r.id !== everyoneId &&
      !r.managed &&
      botMember.roles.highest.position > r.position
  );

  const deleted = [];
  const failed = [];

  for (const role of rolesToDelete.values()) {
    try {
      const name = role.name;
      await role.delete(`Delete all roles by ${interaction.user.tag}`);
      deleted.push(name);
    } catch (err) {
      failed.push(`"${role.name}" — Discord error: ${err.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Delete All Roles — Results')
    .setColor(deleted.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      {
        name: '✅ Deleted',
        value: deleted.length > 0 ? deleted.join('\n').slice(0, 1024) : 'None',
        inline: true
      },
      {
        name: '❌ Failed / Skipped',
        value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'None',
        inline: true
      }
    )
    .setFooter({ text: `${deleted.length} deleted, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleListBots(interaction) {
  await interaction.deferReply();

  try {
    await interaction.guild.members.fetch(); // populate full member cache
    const bots = interaction.guild.members.cache.filter(m => m.user.bot);

    if (bots.size === 0) {
      return interaction.editReply('No bots found in this server.');
    }

    const lines = bots.map(m => `${m.user.username} (${m.user.id})`);
    const chunks = [];
    let current = '';
    for (const line of lines) {
      if ((current + line + '\n').length > 1000) {
        chunks.push(current);
        current = '';
      }
      current += line + '\n';
    }
    if (current) chunks.push(current);

    const embed = new EmbedBuilder()
      .setTitle(`Bots in this server (${bots.size})`)
      .setColor(0x5865f2)
      .setDescription(chunks[0] || 'None');

    await interaction.editReply({ embeds: [embed] });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i] });
    }
  } catch (err) {
    await interaction.editReply(
      `Couldn't fetch members: ${err.message}. Make sure "Server Members Intent" is enabled for this bot in the Discord Developer Portal (Bot tab).`
    );
  }
}

async function handleKickBots(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers)) {
    return interaction.reply({
      content: 'You need the **Kick Members** permission to use this command.',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    return interaction.reply({
      content: 'I need the **Kick Members** permission to kick bots.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const raw = interaction.options.getString('list');
  const names = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  await interaction.guild.members.fetch(); // populate full member cache

  const kicked = [];
  const failed = [];

  for (const name of names) {
    const member = interaction.guild.members.cache.find(
      m => m.user.bot && m.user.username.toLowerCase() === name.toLowerCase()
    );

    if (!member) {
      failed.push(`"${name}" — bot not found in this server`);
      continue;
    }
    if (!member.kickable) {
      failed.push(`"${name}" — I can't kick this bot (its role may be above mine)`);
      continue;
    }

    try {
      await member.kick(`Bulk bot kick by ${interaction.user.tag}`);
      kicked.push(name);
    } catch (err) {
      failed.push(`"${name}" — Discord error: ${err.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Kick Bots — Results')
    .setColor(kicked.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      {
        name: '✅ Kicked',
        value: kicked.length > 0 ? kicked.join('\n').slice(0, 1024) : 'None',
        inline: true
      },
      {
        name: '❌ Failed',
        value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'None',
        inline: true
      }
    )
    .setFooter({ text: `${kicked.length} kicked, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}

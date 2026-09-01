const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Tiny web server so Railway sees the app as "healthy" and doesn't keep restarting it.
require('http')
  .createServer((req, res) => res.end('Bot is running'))
  .listen(process.env.PORT || 3000);

// ⚠️ Put ALL your Discord server IDs here (one per server, comma-separated).
const GUILD_IDS = [
  '1530186411179769897',
  '1493902508609765519'
];

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
    ),
  new SlashCommandBuilder()
    .setName('cleanupbotroles')
    .setDescription('Delete duplicate-named roles and 0-member roles (leftover bot integration roles)')
    .addStringOption(option =>
      option
        .setName('confirm')
        .setDescription('Type CONFIRM to proceed')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('copyroles')
    .setDescription('Copy all roles (name, color, perms) from this server to another server the bot is in')
    .addStringOption(option =>
      option
        .setName('target_server_id')
        .setDescription('Server ID to copy roles INTO')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('confirm')
        .setDescription('Type CONFIRM to proceed')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('deletecategory')
    .setDescription('Delete one or more categories AND every channel inside them')
    .addStringOption(option =>
      option
        .setName('categories')
        .setDescription('Category names or IDs, one per line')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('confirm')
        .setDescription('Type CONFIRM to proceed')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('renamecategory')
    .setDescription('Preview and rename all channels in a category by their current order')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Category name or ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('names')
        .setDescription('New channel names, one per line, in the same order')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('channelperms')
    .setDescription('Show simplified permission overwrites for a category or a single channel')
    .addStringOption(option =>
      option
        .setName('target')
        .setDescription('Category or channel name (or ID)')
        .setRequired(true)
    )
,
  new SlashCommandBuilder()
    .setName('bulkrenamechannels')
    .setDescription('Rename multiple channels at once')
    .addStringOption(option =>
      option
        .setName('list')
        .setDescription('Old channel name | New channel name, one per line')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('rolecopy')
    .setDescription('Pick roles from a menu and copy them (with permissions) to another server'),
  new SlashCommandBuilder()
    .setName('channelcopy')
    .setDescription('Pick channels/categories from a menu and copy them (with permissions) to another server'),
  new SlashCommandBuilder()
    .setName('categorycopy')
    .setDescription('Copy one specific category and ALL of its channels to another server')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Category name or ID')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    for (const guildId of GUILD_IDS) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, guildId),
          { body: commands }
        );
        console.log(`Slash commands registered instantly for server ${guildId}`);
      } catch (err) {
        console.error(`Failed to register commands for server ${guildId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Failed to set up REST client:', err);
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
  if (interaction.commandName === 'cleanupbotroles') return handleCleanupBotRoles(interaction);
  if (interaction.commandName === 'copyroles') return handleCopyRoles(interaction);
  if (interaction.commandName === 'deletecategory') return handleDeleteCategory(interaction);
  if (interaction.commandName === 'renamecategory') return handleRenameCategory(interaction);
  if (interaction.commandName === 'channelperms') return handleChannelPerms(interaction);
  if (interaction.commandName === 'bulkrenamechannels') return handleBulkRenameChannels(interaction);
  if (interaction.commandName === 'rolecopy') return handleRoleCopy(interaction);
  if (interaction.commandName === 'channelcopy') return handleChannelCopy(interaction);
  if (interaction.commandName === 'categorycopy') return handleCategoryCopy(interaction);
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

async function handleCleanupBotRoles(interaction) {
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
      content:
        '⚠️ This deletes every role that (a) shares its name with another role (duplicates), or (b) has 0 members — including leftover bot integration roles. Run again with `confirm: CONFIRM` (all caps) if you\'re sure.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  await interaction.guild.roles.fetch();
  await interaction.guild.members.fetch(); // so member counts are accurate

  const everyoneId = interaction.guild.id;
  const nameCounts = new Map();
  const allRoles = [...interaction.guild.roles.cache.values()].filter(r => r.id !== everyoneId);

  for (const r of allRoles) {
    nameCounts.set(r.name, (nameCounts.get(r.name) || 0) + 1);
  }

  const toDelete = allRoles.filter(r => {
    if (r.tags?.premiumSubscriberRole) return false; // never touch the Nitro Booster role
    if (r.tags?.botId === client.user.id) return false; // never delete our own bot's role
    if (botMember.roles.highest.position <= r.position) return false; // can't manage it anyway
    const isDuplicateName = nameCounts.get(r.name) > 1;
    const hasNoMembers = r.members.size === 0;
    return isDuplicateName || hasNoMembers;
  });

  const deleted = [];
  const failed = [];

  for (const role of toDelete) {
    try {
      const name = role.name;
      await role.delete(`Cleanup duplicate/empty roles by ${interaction.user.tag}`);
      deleted.push(name);
    } catch (err) {
      failed.push(`"${role.name}" — Discord error: ${err.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Cleanup Bot Roles — Results')
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
    .setFooter({ text: `${deleted.length} deleted, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleCopyRoles(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'You need the **Manage Roles** permission to use this command.',
      ephemeral: true
    });
  }

  const sourceBotMember = interaction.guild.members.me;
  if (!sourceBotMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'I need the **Manage Roles** permission in this (source) server.',
      ephemeral: true
    });
  }

  const targetId = interaction.options.getString('target_server_id').trim();
  const confirm = interaction.options.getString('confirm');

  const targetGuild = client.guilds.cache.get(targetId);
  if (!targetGuild) {
    return interaction.reply({
      content: `I'm not in a server with ID \`${targetId}\`. Invite me there first.`,
      ephemeral: true
    });
  }

  if (confirm !== 'CONFIRM') {
    return interaction.reply({
      content: `⚠️ This will copy every role from **${interaction.guild.name}** into **${targetGuild.name}**. Run again with \`confirm: CONFIRM\` (all caps) if you're sure.`,
      ephemeral: true
    });
  }

  const targetBotMember = targetGuild.members.me;
  if (!targetBotMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: `I don't have **Manage Roles** permission in **${targetGuild.name}**.`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  await interaction.guild.roles.fetch();
  await targetGuild.roles.fetch();

  const everyoneId = interaction.guild.id;
  const targetEveryoneId = targetGuild.id;

  // Source roles, lowest to highest, skipping @everyone and managed/integration roles
  const sourceRoles = [...interaction.guild.roles.cache.values()]
    .filter(r => r.id !== everyoneId && !r.managed)
    .sort((a, b) => a.position - b.position);

  const existingTargetNames = new Set(
    [...targetGuild.roles.cache.values()]
      .filter(r => r.id !== targetEveryoneId)
      .map(r => r.name.toLowerCase())
  );

  const created = [];
  const skipped = [];
  const failed = [];

  for (const role of sourceRoles) {
    if (existingTargetNames.has(role.name.toLowerCase())) {
      skipped.push(`"${role.name}" — already exists in target server`);
      continue;
    }
    try {
      const newRole = await targetGuild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.bitfield,
        reason: `Copied from ${interaction.guild.name} by ${interaction.user.tag}`
      });
      created.push(newRole);
    } catch (err) {
      failed.push(`"${role.name}" — Discord error: ${err.message}`);
    }
  }

  // Reposition newly created roles to preserve relative order, just below the target bot's highest role
  if (created.length > 0) {
    try {
      const botHighest = targetBotMember.roles.highest.position;
      const positions = created.map((role, index) => ({
        role: role.id,
        position: Math.max(1, botHighest - 1 - index)
      }));
      await targetGuild.roles.setPositions(positions);
    } catch (err) {
      failed.push(`Hierarchy ordering step failed: ${err.message} (roles were created, order may need manual fixing)`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`Copy Roles: ${interaction.guild.name} → ${targetGuild.name}`)
    .setColor(created.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      {
        name: '✅ Created',
        value: created.length > 0 ? created.map(r => r.name).join('\n').slice(0, 1024) : 'None',
        inline: true
      },
      {
        name: '⏭️ Skipped',
        value: skipped.length > 0 ? skipped.join('\n').slice(0, 1024) : 'None',
        inline: true
      },
      {
        name: '❌ Failed',
        value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'None',
        inline: true
      }
    )
    .setFooter({ text: `${created.length} created, ${skipped.length} skipped, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleDeleteCategory(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'You need the **Manage Channels** permission to use this command.',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'I need the **Manage Channels** permission to delete channels/categories.',
      ephemeral: true
    });
  }

  const raw = interaction.options.getString('categories');
  const confirm = interaction.options.getString('confirm');
  const inputs = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  await interaction.guild.channels.fetch();

  const notFound = [];
  const plan = []; // { category, children: [...] }

  for (const input of inputs) {
    const category = interaction.guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildCategory &&
        (c.id === input || c.name.toLowerCase() === input.toLowerCase())
    );
    if (!category) {
      notFound.push(input);
      continue;
    }
    const children = interaction.guild.channels.cache.filter(c => c.parentId === category.id);
    plan.push({ category, children: [...children.values()] });
  }

  if (plan.length === 0) {
    return interaction.reply({
      content: `None of the categories you listed were found: ${notFound.join(', ') || '(none valid)'}`,
      ephemeral: true
    });
  }

  if (confirm !== 'CONFIRM') {
    const lines = plan.map(p => {
      const channelList =
        p.children.length > 0
          ? p.children.map(c => `   • #${c.name}`).join('\n')
          : '   (no channels inside)';
      return `**${p.category.name}** (${p.children.length} channel${p.children.length === 1 ? '' : 's'})\n${channelList}`;
    });

    let notFoundNote = '';
    if (notFound.length > 0) {
      notFoundNote = `\n\n⚠️ Not found, skipped: ${notFound.join(', ')}`;
    }

    return interaction.reply({
      content:
        `⚠️ **This will permanently delete the following categories and every channel inside them:**\n\n` +
        lines.join('\n\n') +
        notFoundNote +
        `\n\nNo other channels will be touched. Run again with \`confirm: CONFIRM\` (all caps) if you're sure.`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const deleted = [];
  const failed = [];

  for (const { category, children } of plan) {
    for (const channel of children) {
      try {
        const name = channel.name;
        await channel.delete(`Category cleanup by ${interaction.user.tag}`);
        deleted.push(`#${name} (from ${category.name})`);
      } catch (err) {
        failed.push(`"${channel.name}" — Discord error: ${err.message}`);
      }
    }
    try {
      await category.delete(`Category deletion by ${interaction.user.tag}`);
      deleted.push(`[category] ${category.name}`);
    } catch (err) {
      failed.push(`"${category.name}" (category) — Discord error: ${err.message}`);
    }
  }

  if (notFound.length > 0) {
    failed.push(`Not found: ${notFound.join(', ')}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('Delete Categories — Results')
    .setColor(failed.length === 0 ? 0x00ff00 : 0xff0000)
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
    .setFooter({ text: `${deleted.length} deleted, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleBulkRenameChannels(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: 'You need the **Manage Channels** permission to rename channels.', ephemeral: true });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: 'I need the **Manage Channels** permission to rename channels.', ephemeral: true });
  }

  await interaction.deferReply();
  const raw = interaction.options.getString('list');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  await interaction.guild.channels.fetch();

  const renamed = [];
  const failed = [];

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      failed.push(`"${line}" — invalid format (use OldName | NewName)`);
      continue;
    }

    const [oldName, newName] = parts;
    const channel = interaction.guild.channels.cache.find(
      c => c.name.toLowerCase() === oldName.toLowerCase()
    );

    if (!channel) {
      failed.push(`"${oldName}" — channel not found`);
      continue;
    }

    if (!channel.manageable) {
      failed.push(`"${oldName}" — I can't manage this channel`);
      continue;
    }

    try {
      await channel.setName(newName, `Bulk channel rename by ${interaction.user.tag}`);
      renamed.push(`#${oldName} → #${newName}`);
    } catch (err) {
      failed.push(`"${oldName}" → "${newName}" — Discord error: ${err.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Bulk Channel Rename Results')
    .setColor(renamed.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: '✅ Renamed', value: renamed.length ? renamed.join('\n').slice(0, 1024) : 'None', inline: true },
      { name: '❌ Failed', value: failed.length ? failed.join('\n').slice(0, 1024) : 'None', inline: true }
    )
    .setFooter({ text: `${renamed.length} renamed, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
}


async function handleRenameCategory(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'You need the **Manage Channels** permission to use this command.',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'I need the **Manage Channels** permission to rename channels.',
      ephemeral: true
    });
  }

  const categoryInput = interaction.options.getString('category').trim();
  const rawNames = interaction.options.getString('names');

  const newNames = rawNames
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  await interaction.guild.channels.fetch();

  const category = interaction.guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      (c.id === categoryInput ||
        c.name.toLowerCase() === categoryInput.toLowerCase())
  );

  if (!category) {
    return interaction.reply({
      content: `❌ Category not found: \`${categoryInput}\``,
      ephemeral: true
    });
  }

  const channels = [...interaction.guild.channels.cache.values()]
    .filter(c => c.parentId === category.id)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  if (channels.length === 0) {
    return interaction.reply({
      content: `❌ **${category.name}** has no channels.`,
      ephemeral: true
    });
  }

  if (newNames.length !== channels.length) {
    return interaction.reply({
      content:
        `❌ **Channel count doesn't match.**\n\n` +
        `Category: **${category.name}**\n` +
        `Channels found: **${channels.length}**\n` +
        `New names given: **${newNames.length}**\n\n` +
        `Give exactly **${channels.length}** new names, one per line, in the same order.`,
      ephemeral: true
    });
  }

  const invalidNames = newNames.filter(name => name.length > 100);
  if (invalidNames.length > 0) {
    return interaction.reply({
      content: '❌ Each channel name must be 100 characters or fewer.',
      ephemeral: true
    });
  }

  const changes = channels.map((channel, index) => ({
    channel,
    newName: newNames[index]
  }));

  const previewLines = changes.map(
    ({ channel, newName }, index) =>
      `\`${index + 1}.\` #${channel.name}  →  **#${newName}**`
  );

  const previewEmbed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Channel Rename')
    .setColor(0xfee75c)
    .setDescription(
      `**Category:** ${category.name}\n\n` +
      previewLines.join('\n').slice(0, 3900) +
      (previewLines.join('\n').length > 3900
        ? '\n\n…more changes will be applied after confirmation.'
        : '') +
      `\n\n**Nothing has been changed yet.**`
    )
    .setFooter({
      text: 'Press Confirm to apply these names in the current channel order.'
    });

  const confirmButton = new ButtonBuilder()
    .setCustomId(`renamecategory_confirm_${interaction.id}`)
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`renamecategory_cancel_${interaction.id}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(
    confirmButton,
    cancelButton
  );

  const previewMessage = await interaction.reply({
    embeds: [previewEmbed],
    components: [row],
    ephemeral: true,
    fetchReply: true
  });

  const collector = previewMessage.createMessageComponentCollector({
    time: 60_000,
    max: 1,
    filter: buttonInteraction =>
      buttonInteraction.user.id === interaction.user.id &&
      buttonInteraction.customId.startsWith(`renamecategory_`)
  });

  collector.on('collect', async buttonInteraction => {
    if (buttonInteraction.customId.startsWith('renamecategory_cancel_')) {
      const cancelledEmbed = new EmbedBuilder()
        .setTitle('❌ Channel Rename Cancelled')
        .setColor(0xff0000)
        .setDescription('No channel names were changed.');

      return buttonInteraction.update({
        embeds: [cancelledEmbed],
        components: []
      });
    }

    await buttonInteraction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('⏳ Renaming Channels...')
          .setColor(0x5865f2)
          .setDescription('Applying the confirmed names in the category order...')
      ],
      components: []
    });

    // Re-fetch so the operation uses the current category order.
    await interaction.guild.channels.fetch();

    const currentChannels = [...interaction.guild.channels.cache.values()]
      .filter(c => c.parentId === category.id)
      .sort((a, b) => a.rawPosition - b.rawPosition);

    if (currentChannels.length !== newNames.length) {
      return buttonInteraction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Rename Aborted')
            .setColor(0xff0000)
            .setDescription(
              `The number of channels changed after the preview.\n\n` +
              `Expected: **${newNames.length}**\n` +
              `Found: **${currentChannels.length}**\n\n` +
              `Nothing was changed. Run the command again.`
            )
        ],
        components: []
      });
    }

    const renamed = [];
    const failed = [];

    for (let i = 0; i < currentChannels.length; i++) {
      const channel = currentChannels[i];
      const newName = newNames[i];

      if (!channel.manageable) {
        failed.push(`#${channel.name} → #${newName} — I can't manage this channel`);
        continue;
      }

      try {
        const oldName = channel.name;

        if (oldName === newName) {
          renamed.push(`#${oldName} → #${newName} (already same)`);
          continue;
        }

        await channel.setName(
          newName,
          `Category bulk rename by ${interaction.user.tag}`
        );

        renamed.push(`#${oldName} → #${newName}`);
      } catch (err) {
        failed.push(`#${channel.name} → #${newName} — ${err.message}`);
      }
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle('✅ Category Rename Results')
      .setColor(failed.length === 0 ? 0x00ff00 : 0xffa500)
      .addFields(
        {
          name: 'Category',
          value: category.name,
          inline: false
        },
        {
          name: '✅ Renamed',
          value: renamed.length
            ? renamed.join('\n').slice(0, 1024)
            : 'None',
          inline: false
        },
        {
          name: '❌ Failed',
          value: failed.length
            ? failed.join('\n').slice(0, 1024)
            : 'None',
          inline: false
        }
      )
      .setFooter({
        text: `${renamed.length} processed, ${failed.length} failed`
      });

    await buttonInteraction.editReply({
      embeds: [resultEmbed],
      components: []
    });
  });

  collector.on('end', async collected => {
    if (collected.size === 0) {
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('⌛ Rename Timed Out')
              .setColor(0x808080)
              .setDescription(
                'No confirmation was received within 60 seconds.\nNo channel names were changed.'
              )
          ],
          components: []
        });
      } catch (_) {}
    }
  });
}

function formatOverwrites(channel) {
  if (channel.permissionOverwrites.cache.size === 0) {
    return '_No custom overwrites (uses default permissions)_';
  }

  const lines = [];
  for (const ow of channel.permissionOverwrites.cache.values()) {
    let target;
    if (ow.type === 0) {
      const role = channel.guild.roles.cache.get(ow.id);
      target = role ? (role.id === channel.guild.id ? '@everyone' : `@${role.name}`) : `role:${ow.id}`;
    } else {
      const member = channel.guild.members.cache.get(ow.id);
      target = member ? `${member.user.username} (member)` : `user:${ow.id}`;
    }

    const allow = ow.allow.toArray();
    const deny = ow.deny.toArray();

    let line = `**${target}**`;
    if (allow.length > 0) line += `\n   ✅ ${allow.join(', ')}`;
    if (deny.length > 0) line += `\n   ❌ ${deny.join(', ')}`;
    lines.push(line);
  }
  return lines.join('\n');
}

async function handleChannelPerms(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'You need the **Manage Roles** permission to use this command.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const input = interaction.options.getString('target').trim();

  await interaction.guild.channels.fetch();
  await interaction.guild.members.fetch(); // so member overwrites resolve to usernames

  const target = interaction.guild.channels.cache.find(
    c => c.id === input || c.name.toLowerCase() === input.toLowerCase()
  );

  if (!target) {
    return interaction.editReply(`No category or channel found matching "${input}".`);
  }

  const chunks = [];

  if (target.type === ChannelType.GuildCategory) {
    const children = [...interaction.guild.channels.cache.filter(c => c.parentId === target.id).values()];

    let block = `**[Category] ${target.name}**\n${formatOverwrites(target)}\n`;
    chunks.push(block);

    if (children.length === 0) {
      chunks.push('_(no channels inside this category)_');
    }

    for (const ch of children) {
      const synced = ch.permissionsLocked ? ' (synced with category)' : '';
      const section = `\n**#${ch.name}**${synced}\n${formatOverwrites(ch)}\n`;
      if ((chunks[chunks.length - 1] + section).length > 1800) {
        chunks.push(section);
      } else {
        chunks[chunks.length - 1] += section;
      }
    }
  } else {
    const synced = target.permissionsLocked ? ' (synced with category)' : '';
    chunks.push(`**#${target.name}**${synced}\n${formatOverwrites(target)}`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`Permissions: ${target.name}`)
    .setColor(0x5865f2)
    .setDescription(chunks[0].slice(0, 4000));

  await interaction.editReply({ embeds: [embed] });

  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(chunks[i].slice(0, 4000))]
    });
  }
}

// ============================================================
// Cross-server COPY: roles / channels / categories (interactive)
// ============================================================

function getMutualTargetGuilds(sourceGuildId) {
  return [...client.guilds.cache.values()].filter(g => g.id !== sourceGuildId);
}

// Maps a source channel/category's role-based permission overwrites onto the
// target server by matching role NAMES (role IDs differ between servers).
// @everyone is mapped automatically. Member-specific overwrites are skipped
// since they rarely make sense across two different servers. Role overwrites
// with no matching role name in the target are skipped (noted, not fatal).
function mapRoleOverwritesToTarget(sourceOverwrites, sourceGuild, targetGuild) {
  const result = [];
  const targetRolesByName = new Map(
    [...targetGuild.roles.cache.values()].map(r => [r.name.toLowerCase(), r])
  );

  for (const ow of sourceOverwrites.values()) {
    if (ow.type !== 0) continue; // 0 = role, 1 = member — only role overwrites are portable

    let targetRoleId;
    if (ow.id === sourceGuild.id) {
      targetRoleId = targetGuild.id; // @everyone maps to target's @everyone
    } else {
      const sourceRole = sourceGuild.roles.cache.get(ow.id);
      if (!sourceRole) continue;
      const match = targetRolesByName.get(sourceRole.name.toLowerCase());
      if (!match) continue; // no same-named role exists yet in target — skip this overwrite
      targetRoleId = match.id;
    }

    result.push({
      id: targetRoleId,
      allow: ow.allow.bitfield,
      deny: ow.deny.bitfield
    });
  }

  return result;
}

async function copySelectedRoles(sourceGuild, targetGuild, roleIds, requesterTag, anchorRoleId = 'NONE') {
  await sourceGuild.roles.fetch();
  await targetGuild.roles.fetch();

  const targetBotMember = targetGuild.members.me;
  const existingTargetByName = new Map(
    [...targetGuild.roles.cache.values()]
      .filter(r => r.id !== targetGuild.id)
      .map(r => [r.name.toLowerCase(), r])
  );

  const roles = roleIds
    .map(id => sourceGuild.roles.cache.get(id))
    .filter(Boolean)
    .sort((a, b) => a.position - b.position);

  const created = [];
  const createdBySourceId = new Map(); // sourceRoleId -> newly created target role
  const skipped = [];
  const failed = [];

  for (const role of roles) {
    if (existingTargetByName.has(role.name.toLowerCase())) {
      skipped.push(`"${role.name}" — already exists in target server`);
      continue;
    }
    try {
      const newRole = await targetGuild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.bitfield,
        reason: `Copied from ${sourceGuild.name} by ${requesterTag}`
      });
      created.push(newRole);
      createdBySourceId.set(role.id, newRole);
    } catch (err) {
      failed.push(`"${role.name}" — Discord error: ${err.message}`);
    }
  }

  if (created.length > 0 && targetBotMember) {
    try {
      const botCeiling = targetBotMember.roles.highest.position - 1; // can never place at/above the bot's own role
      const positions = [];

      if (anchorRoleId === 'AUTO') {
        // Walk the SOURCE guild's full role list top -> bottom (its real hierarchy,
        // not just the roles that were selected) and thread every newly created
        // role into the exact same relative slot in the target — using any
        // same-named role that already exists in the target as a "checkpoint" to
        // re-anchor against. This rebuilds the original hierarchy automatically,
        // without asking the user to pick an anchor by hand.
        const allSourceRolesDesc = [...sourceGuild.roles.cache.values()]
          .filter(r => r.id !== sourceGuild.id)
          .sort((a, b) => b.position - a.position);

        let cursor = botCeiling;
        for (const sRole of allSourceRolesDesc) {
          const newRole = createdBySourceId.get(sRole.id);
          if (newRole) {
            const pos = Math.max(1, Math.min(cursor, botCeiling));
            positions.push({ role: newRole.id, position: pos });
            cursor = pos - 1;
            continue;
          }
          const checkpoint = existingTargetByName.get(sRole.name.toLowerCase());
          if (checkpoint) {
            cursor = Math.min(checkpoint.position - 1, botCeiling);
          }
        }
      } else if (anchorRoleId && anchorRoleId !== 'NONE') {
        const anchorRole = targetGuild.roles.cache.get(anchorRoleId);
        const startPosition = anchorRole ? Math.min(anchorRole.position - 1, botCeiling) : botCeiling;
        created.forEach((role, index) => {
          positions.push({ role: role.id, position: Math.max(1, startPosition - index) });
        });
      } else {
        created.forEach((role, index) => {
          positions.push({ role: role.id, position: Math.max(1, botCeiling - index) });
        });
      }

      await targetGuild.roles.setPositions(positions);
    } catch (err) {
      failed.push(`Hierarchy ordering step failed: ${err.message} (roles were created, order may need manual fixing)`);
    }
  }

  return { created, skipped, failed };
}

// Builds the flat, indented list of selectable items for the channel/category
// picker: 📁 Category, then its channels indented underneath, then any
// channels that aren't inside a category.
function buildChannelSelectItems(guild) {
  const all = [...guild.channels.cache.values()];
  const categories = all
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  const items = [];
  for (const cat of categories) {
    items.push({ id: cat.id, label: `📁 ${cat.name}` });
    const children = all
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition);
    for (const ch of children) {
      items.push({ id: ch.id, label: `　#${ch.name}` });
    }
  }

  const orphans = all
    .filter(c => c.type !== ChannelType.GuildCategory && !c.parentId)
    .sort((a, b) => a.rawPosition - b.rawPosition);
  for (const ch of orphans) {
    items.push({ id: ch.id, label: `#${ch.name}` });
  }

  return items;
}

// Copies the selected mix of category/channel IDs into targetGuild.
// Picking a category ALSO copies every channel inside it automatically,
// even if those child channels weren't individually selected.
async function copySelectedChannelItems(sourceGuild, targetGuild, itemIds, requesterTag) {
  await sourceGuild.channels.fetch();
  await targetGuild.channels.fetch();
  await sourceGuild.roles.fetch();
  await targetGuild.roles.fetch();

  const allSourceChannels = [...sourceGuild.channels.cache.values()];
  const idSet = new Set(itemIds);

  const selectedCategories = allSourceChannels.filter(
    c => c.type === ChannelType.GuildCategory && idSet.has(c.id)
  );
  const selectedStandalone = allSourceChannels.filter(
    c => c.type !== ChannelType.GuildCategory && idSet.has(c.id)
  );

  const createdCategories = [];
  const createdChannels = [];
  const failed = [];
  const processed = new Set();
  const categoryIdMap = new Map(); // sourceCategoryId -> newly created category channel

  function buildChannelOptions(sourceChannel, parentId) {
    const opts = {
      name: sourceChannel.name,
      type: sourceChannel.type,
      permissionOverwrites: mapRoleOverwritesToTarget(
        sourceChannel.permissionOverwrites.cache,
        sourceGuild,
        targetGuild
      ),
      reason: `Copied from ${sourceGuild.name} by ${requesterTag}`
    };
    if (parentId) opts.parent = parentId;
    if ('topic' in sourceChannel && sourceChannel.topic) opts.topic = sourceChannel.topic;
    if ('nsfw' in sourceChannel) opts.nsfw = sourceChannel.nsfw;
    if ('rateLimitPerUser' in sourceChannel && sourceChannel.rateLimitPerUser) {
      opts.rateLimitPerUser = sourceChannel.rateLimitPerUser;
    }
    if ('bitrate' in sourceChannel && sourceChannel.bitrate) opts.bitrate = sourceChannel.bitrate;
    if ('userLimit' in sourceChannel && sourceChannel.userLimit) opts.userLimit = sourceChannel.userLimit;
    return opts;
  }

  for (const category of selectedCategories) {
    try {
      const newCategory = await targetGuild.channels.create(buildChannelOptions(category, null));
      createdCategories.push(newCategory);
      categoryIdMap.set(category.id, newCategory);
    } catch (err) {
      failed.push(`📁 ${category.name} — Discord error: ${err.message}`);
      continue;
    }
    processed.add(category.id);

    const children = allSourceChannels
      .filter(c => c.parentId === category.id)
      .sort((a, b) => a.rawPosition - b.rawPosition);

    for (const child of children) {
      try {
        const newChannel = await targetGuild.channels.create(
          buildChannelOptions(child, categoryIdMap.get(category.id).id)
        );
        createdChannels.push(newChannel);
      } catch (err) {
        failed.push(`#${child.name} (in ${category.name}) — Discord error: ${err.message}`);
      }
      processed.add(child.id);
    }
  }

  for (const channel of selectedStandalone) {
    if (processed.has(channel.id)) continue;
    const mappedParent = channel.parentId ? categoryIdMap.get(channel.parentId) : null;
    try {
      const newChannel = await targetGuild.channels.create(
        buildChannelOptions(channel, mappedParent ? mappedParent.id : null)
      );
      createdChannels.push(newChannel);
    } catch (err) {
      failed.push(`#${channel.name} — Discord error: ${err.message}`);
    }
    processed.add(channel.id);
  }

  return { createdCategories, createdChannels, failed };
}

// Generic multi-stage wizard: [pick items ->] pick target server -> confirm -> execute.
// config: {
//   prefix, items, itemNoun, targetGuilds,
//   skipSelection (optional), presetIds (optional, used when skipSelection),
//   confirmText(selectedCount, targetGuild) => string,
//   execute(targetGuild, selectedIds) => Promise<EmbedBuilder>
// }
async function runCopyWizard(interaction, config) {
  const { prefix, items, targetGuilds } = config;
  let stage = config.skipSelection ? 'target' : 'select';
  let page = 0;
  const selected = new Set(config.presetIds || []);
  let targetGuildId = null;
  let anchorRoleId = 'NONE'; // 'AUTO' = auto-match source hierarchy, 'NONE' = bottom, or a target role ID
  let finished = false;

  function currentPageItems() {
    return items.slice(page * 25, page * 25 + 25);
  }

  function renderSelectStage() {
    const totalPages = Math.max(1, Math.ceil(items.length / 25));
    const pageItems = currentPageItems();
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`${prefix}_select`)
      .setPlaceholder(`Select ${config.itemNoun} — page ${page + 1}/${totalPages}`)
      .setMinValues(0)
      .setMaxValues(Math.max(1, pageItems.length))
      .addOptions(pageItems.map(it => ({
        label: it.label.slice(0, 100),
        value: it.id,
        default: selected.has(it.id)
      })));
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${prefix}_prev`).setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId(`${prefix}_next`).setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
      new ButtonBuilder().setCustomId(`${prefix}_done`).setLabel(`Done (${selected.size} selected)`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${prefix}_cancel`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );
    const embed = new EmbedBuilder()
      .setTitle(`Select ${config.itemNoun} to copy`)
      .setColor(0x5865f2)
      .setDescription(`Currently selected: **${selected.size}**\nPick items below, then hit **Done**. Your selections carry across pages.`);
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu), navRow] };
  }

  function renderTargetStage() {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`${prefix}_target_select`)
      .setPlaceholder('Choose the target server')
      .addOptions(targetGuilds.slice(0, 25).map(g => ({
        label: g.name.slice(0, 100),
        value: g.id,
        description: `ID: ${g.id}`
      })));
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${prefix}_target_cancel`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );
    const embed = new EmbedBuilder()
      .setTitle('Choose target server')
      .setColor(0x5865f2)
      .setDescription(`Copying **${selected.size}** ${config.itemNoun} from **${interaction.guild.name}**.\nPick the server to copy into:`);
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu), navRow] };
  }

  function renderAnchorStage(targetGuild) {
    const roles = [...targetGuild.roles.cache.values()]
      .filter(r => r.id !== targetGuild.id && !r.managed)
      .sort((a, b) => b.position - a.position)
      .slice(0, 24); // leave a slot for the "bottom" option

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`${prefix}_anchor_select`)
      .setPlaceholder('Place copied role(s) just below which role?')
      .addOptions([
        { label: '🔗 Auto-match source server\'s hierarchy (recommended)', value: 'AUTO', default: anchorRoleId === 'AUTO' },
        { label: 'Bottom (default position)', value: 'NONE', default: anchorRoleId === 'NONE' },
        ...roles.map(r => ({ label: r.name.slice(0, 100), value: r.id, default: anchorRoleId === r.id }))
      ]);
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${prefix}_anchor_cancel`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );
    const embed = new EmbedBuilder()
      .setTitle('Anchor position (optional)')
      .setColor(0x5865f2)
      .setDescription(
        `**Auto-match** rebuilds the exact same hierarchy the roles had in **${interaction.guild.name}** — ` +
        `it slots each new role into the correct spot relative to any same-named roles already in ` +
        `**${targetGuild.name}**, without you having to pick one anchor manually.\n\n` +
        `Or pick a single existing role in **${targetGuild.name}** to place everything directly below it, ` +
        `or leave it at the bottom.`
      );
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu), navRow] };
  }

  function renderConfirmStage(targetGuild) {
    let anchorInfo = null;
    if (config.needsAnchor) {
      if (anchorRoleId === 'AUTO') {
        anchorInfo = 'AUTO';
      } else if (!anchorRoleId || anchorRoleId === 'NONE') {
        anchorInfo = 'Bottom (default)';
      } else {
        anchorInfo = targetGuild.roles.cache.get(anchorRoleId)?.name || 'selected role';
      }
    }
    const embed = new EmbedBuilder()
      .setTitle('Confirm copy')
      .setColor(0xffa500)
      .setDescription(config.confirmText(selected.size, targetGuild, anchorInfo));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${prefix}_confirm`).setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${prefix}_cancel2`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );
    return { embeds: [embed], components: [row] };
  }

  const initial = stage === 'target' ? renderTargetStage() : renderSelectStage();
  const message = await interaction.reply({ ...initial, ephemeral: true, fetchReply: true });

  const collector = message.createMessageComponentCollector({
    time: 180_000,
    filter: i => i.user.id === interaction.user.id && i.customId.startsWith(prefix)
  });

  collector.on('collect', async i => {
    try {
      if (stage === 'select') {
        if (i.customId === `${prefix}_select`) {
          const pageIds = currentPageItems().map(it => it.id);
          for (const id of pageIds) selected.delete(id);
          for (const v of i.values) selected.add(v);
          return i.update(renderSelectStage());
        }
        if (i.customId === `${prefix}_prev`) {
          page = Math.max(0, page - 1);
          return i.update(renderSelectStage());
        }
        if (i.customId === `${prefix}_next`) {
          page = page + 1;
          return i.update(renderSelectStage());
        }
        if (i.customId === `${prefix}_done`) {
          if (selected.size === 0) {
            return i.reply({ content: `Select at least one ${config.itemNoun} first.`, ephemeral: true });
          }
          stage = 'target';
          return i.update(renderTargetStage());
        }
        if (i.customId === `${prefix}_cancel`) {
          finished = true;
          collector.stop('cancelled');
          return i.update({
            embeds: [new EmbedBuilder().setTitle('❌ Cancelled').setColor(0xff0000).setDescription('No changes were made.')],
            components: []
          });
        }
      } else if (stage === 'target') {
        if (i.customId === `${prefix}_target_select`) {
          targetGuildId = i.values[0];
          const targetGuild = client.guilds.cache.get(targetGuildId);
          if (config.needsAnchor) {
            await targetGuild.roles.fetch();
            stage = 'anchor';
            return i.update(renderAnchorStage(targetGuild));
          }
          stage = 'confirm';
          return i.update(renderConfirmStage(targetGuild));
        }
        if (i.customId === `${prefix}_target_cancel`) {
          finished = true;
          collector.stop('cancelled');
          return i.update({
            embeds: [new EmbedBuilder().setTitle('❌ Cancelled').setColor(0xff0000).setDescription('No changes were made.')],
            components: []
          });
        }
      } else if (stage === 'anchor') {
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (i.customId === `${prefix}_anchor_select`) {
          anchorRoleId = i.values[0];
          stage = 'confirm';
          return i.update(renderConfirmStage(targetGuild));
        }
        if (i.customId === `${prefix}_anchor_cancel`) {
          finished = true;
          collector.stop('cancelled');
          return i.update({
            embeds: [new EmbedBuilder().setTitle('❌ Cancelled').setColor(0xff0000).setDescription('No changes were made.')],
            components: []
          });
        }
      } else if (stage === 'confirm') {
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (i.customId === `${prefix}_confirm`) {
          finished = true;
          collector.stop('confirmed');
          await i.update({
            embeds: [new EmbedBuilder().setTitle('⏳ Copying...').setColor(0x5865f2).setDescription('Working on it — this can take a bit for larger selections.')],
            components: []
          });
          try {
            const resultEmbed = await config.execute(targetGuild, [...selected], anchorRoleId);
            await interaction.editReply({ embeds: [resultEmbed], components: [] });
          } catch (err) {
            await interaction.editReply({
              embeds: [new EmbedBuilder().setTitle('❌ Copy Failed').setColor(0xff0000).setDescription(`Something went wrong: ${err.message}`)],
              components: []
            });
          }
          return;
        }
        if (i.customId === `${prefix}_cancel2`) {
          finished = true;
          collector.stop('cancelled');
          return i.update({
            embeds: [new EmbedBuilder().setTitle('❌ Cancelled').setColor(0xff0000).setDescription('No changes were made.')],
            components: []
          });
        }
      }
    } catch (err) {
      try {
        await i.reply({ content: `Error: ${err.message}`, ephemeral: true });
      } catch (_) {}
    }
  });

  collector.on('end', async () => {
    if (!finished) {
      try {
        await interaction.editReply({
          embeds: [new EmbedBuilder().setTitle('⌛ Timed Out').setColor(0x808080).setDescription('No response received in time. Nothing was changed.')],
          components: []
        });
      } catch (_) {}
    }
  });
}

async function handleRoleCopy(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'You need the **Manage Roles** permission to use this command.',
      ephemeral: true
    });
  }
  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return interaction.reply({
      content: 'I need the **Manage Roles** permission in this server.',
      ephemeral: true
    });
  }

  await interaction.guild.roles.fetch();
  const items = [...interaction.guild.roles.cache.values()]
    .filter(r => r.id !== interaction.guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map(r => ({ id: r.id, label: r.name }));

  if (items.length === 0) {
    return interaction.reply({ content: 'There are no copyable roles in this server.', ephemeral: true });
  }

  const targetGuilds = getMutualTargetGuilds(interaction.guild.id);
  if (targetGuilds.length === 0) {
    return interaction.reply({ content: "I'm not in any other server, so there's nowhere to copy roles to.", ephemeral: true });
  }

  return runCopyWizard(interaction, {
    prefix: `rc_${interaction.id}`,
    items,
    itemNoun: 'role(s)',
    targetGuilds,
    needsAnchor: true,
    confirmText: (count, targetGuild, anchorInfo) => {
      let anchorLine;
      if (anchorInfo === 'AUTO') {
        anchorLine = 'Anchor: **auto-matching the original server\'s hierarchy** — same relative order, no manual pick needed.';
      } else if (anchorInfo === 'Bottom (default)') {
        anchorLine = 'Anchor: will be placed at the **bottom** of the role list.';
      } else {
        anchorLine = `Anchor: will be placed just **below "${anchorInfo}"**.`;
      }
      return (
        `Copy **${count}** role(s) from **${interaction.guild.name}** to **${targetGuild.name}**?\n` +
        `${anchorLine}\n` +
        `(Roles that already exist with the same name in the target are skipped.)`
      );
    },
    execute: async (targetGuild, selectedIds, anchorRoleId) => {
      const { created, skipped, failed } = await copySelectedRoles(
        interaction.guild, targetGuild, selectedIds, interaction.user.tag, anchorRoleId
      );
      return new EmbedBuilder()
        .setTitle(`Role Copy: ${interaction.guild.name} → ${targetGuild.name}`)
        .setColor(created.length > 0 ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: '✅ Created', value: created.length ? created.map(r => r.name).join('\n').slice(0, 1024) : 'None', inline: true },
          { name: '⏭️ Skipped', value: skipped.length ? skipped.join('\n').slice(0, 1024) : 'None', inline: true },
          { name: '❌ Failed', value: failed.length ? failed.join('\n').slice(0, 1024) : 'None', inline: true }
        )
        .setFooter({ text: `${created.length} created, ${skipped.length} skipped, ${failed.length} failed` });
    }
  });
}

async function handleChannelCopy(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'You need the **Manage Channels** permission to use this command.',
      ephemeral: true
    });
  }
  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'I need the **Manage Channels** permission in this server.',
      ephemeral: true
    });
  }

  await interaction.guild.channels.fetch();
  const items = buildChannelSelectItems(interaction.guild);

  if (items.length === 0) {
    return interaction.reply({ content: 'There are no channels or categories in this server.', ephemeral: true });
  }

  const targetGuilds = getMutualTargetGuilds(interaction.guild.id);
  if (targetGuilds.length === 0) {
    return interaction.reply({ content: "I'm not in any other server, so there's nowhere to copy to.", ephemeral: true });
  }

  return runCopyWizard(interaction, {
    prefix: `cc_${interaction.id}`,
    items,
    itemNoun: 'channel(s)/category(s)',
    targetGuilds,
    confirmText: (count, targetGuild) =>
      `Copy **${count}** selected item(s) from **${interaction.guild.name}** to **${targetGuild.name}**?\n` +
      `Picking a 📁 category automatically copies **all channels inside it** too. Permission overwrites are recreated by matching role names in the target server.`,
    execute: async (targetGuild, selectedIds) => {
      const { createdCategories, createdChannels, failed } = await copySelectedChannelItems(
        interaction.guild, targetGuild, selectedIds, interaction.user.tag
      );
      return new EmbedBuilder()
        .setTitle(`Channel Copy: ${interaction.guild.name} → ${targetGuild.name}`)
        .setColor(failed.length === 0 ? 0x00ff00 : 0xffa500)
        .addFields(
          { name: '📁 Categories created', value: createdCategories.length ? createdCategories.map(c => c.name).join('\n').slice(0, 1024) : 'None', inline: false },
          { name: '✅ Channels created', value: createdChannels.length ? createdChannels.map(c => `#${c.name}`).join('\n').slice(0, 1024) : 'None', inline: false },
          { name: '❌ Failed', value: failed.length ? failed.join('\n').slice(0, 1024) : 'None', inline: false }
        )
        .setFooter({ text: `${createdCategories.length} categories, ${createdChannels.length} channels, ${failed.length} failed` });
    }
  });
}

async function handleCategoryCopy(interaction) {
  if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'You need the **Manage Channels** permission to use this command.',
      ephemeral: true
    });
  }
  const botMember = interaction.guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: 'I need the **Manage Channels** permission in this server.',
      ephemeral: true
    });
  }

  await interaction.guild.channels.fetch();
  const input = interaction.options.getString('category').trim();
  const category = interaction.guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && (c.id === input || c.name.toLowerCase() === input.toLowerCase())
  );

  if (!category) {
    return interaction.reply({ content: `No category found matching "${input}".`, ephemeral: true });
  }

  const targetGuilds = getMutualTargetGuilds(interaction.guild.id);
  if (targetGuilds.length === 0) {
    return interaction.reply({ content: "I'm not in any other server, so there's nowhere to copy to.", ephemeral: true });
  }

  const childCount = interaction.guild.channels.cache.filter(c => c.parentId === category.id).size;

  return runCopyWizard(interaction, {
    prefix: `cgc_${interaction.id}`,
    items: [],
    itemNoun: 'category',
    targetGuilds,
    skipSelection: true,
    presetIds: [category.id],
    confirmText: (count, targetGuild) =>
      `Copy category **${category.name}** (${childCount} channel(s) inside) from **${interaction.guild.name}** to **${targetGuild.name}**?\n` +
      `Permission overwrites are recreated by matching role names in the target server.`,
    execute: async (targetGuild, selectedIds) => {
      const { createdCategories, createdChannels, failed } = await copySelectedChannelItems(
        interaction.guild, targetGuild, selectedIds, interaction.user.tag
      );
      return new EmbedBuilder()
        .setTitle(`Category Copy: ${interaction.guild.name} → ${targetGuild.name}`)
        .setColor(failed.length === 0 ? 0x00ff00 : 0xffa500)
        .addFields(
          { name: '📁 Category', value: createdCategories.length ? createdCategories[0].name : 'Failed to create', inline: false },
          { name: '✅ Channels created', value: createdChannels.length ? createdChannels.map(c => `#${c.name}`).join('\n').slice(0, 1024) : 'None', inline: false },
          { name: '❌ Failed', value: failed.length ? failed.join('\n').slice(0, 1024) : 'None', inline: false }
        )
        .setFooter({ text: `${createdChannels.length} channels copied, ${failed.length} failed` });
    }
  });
}

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

const commands = [
  new SlashCommandBuilder()
    .setName('bulkroles')
    .setDescription('Bulk create roles with colors')
    .addStringOption(option =>
      option
        .setName('list')
        .setDescription('One per line: Name | #HEXCOLOR')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash command registered.');
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

  const created = [];
  const failed = [];

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length !== 2) {
      failed.push(`"${line}" — invalid format (expected: Name | #HEXCOLOR)`);
      continue;
    }
    const [name, color] = parts;
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
        reason: `Bulk role creation by ${interaction.user.tag}`
      });
      created.push(role);
    } catch (err) {
      failed.push(`"${line}" — Discord error: ${err.message}`);
    }
  }

  // Preserve input order in the role hierarchy (first line = highest role)
  if (created.length > 0) {
    try {
      const botHighest = botMember.roles.highest.position;
      const positions = created.map((role, index) => ({
        role: role.id,
        position: Math.max(1, botHighest - 1 - index)
      }));
      await interaction.guild.roles.setPositions(positions);
    } catch (err) {
      failed.push(
        `Hierarchy ordering step failed: ${err.message} (roles were created, but order may need manual fixing — make sure my highest role is above them)`
      );
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Bulk Role Creation Results')
    .setColor(created.length > 0 ? 0x00ff00 : 0xff0000)
    .addFields(
      {
        name: '✅ Created',
        value: created.length > 0 ? created.map(r => r.name).join('\n') : 'None',
        inline: true
      },
      {
        name: '❌ Failed',
        value: failed.length > 0 ? failed.join('\n').slice(0, 1024) : 'None',
        inline: true
      }
    )
    .setFooter({ text: `${created.length} succeeded, ${failed.length} failed` });

  await interaction.editReply({ embeds: [embed] });
});

client.login(process.env.TOKEN);

import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import fs from 'node:fs';

interface Player {
  userId: string;
  name: string;
  familyName: string;
  gs: number;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const token = process.env.TOKEN!;
const rest = new REST({ version: '10' }).setToken(token);
const CLIENT_ID = '1498391883863294122';

const commands = [
  {
    name: 'gear',
    description: 'Sistema de ranking GS',
    options: [
      {
        name: 'set',
        description: 'Define seu GS',
        type: 1,
        options: [
          {
            name: 'gs',
            description: 'Seu Gear Score',
            type: 4,
            required: true,
          },
          {
            name: 'nome_familia',
            description: 'Seu nome de família (opcional se já cadastrado)',
            type: 3,
            required: false,
          },
        ],
      },
      {
        name: 'top',
        description: 'Mostra o top 20',
        type: 1,
      },
      {
        name: 'me',
        description: 'Mostra sua posição no ranking',
        type: 1,
      },
    ],
  },
];

let data: Player[] = [];

// 📥 Carregar dados
if (fs.existsSync('./data.json')) {
  data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
}

// 💾 Salvar dados
function save() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// 🏆 Ranking
function getRanking(): Player[] {
  return [...data].sort((a, b) => b.gs - a.gs);
}

// 📌 Função de registro de comandos
async function registerCommands(guildId: string, guildName: string) {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guildId),
      { body: commands }
    );
    console.log(`✅ Comandos registrados na guild: ${guildName}`);
  } catch (err) {
    console.error(`❌ Erro ao registrar na guild ${guildName}:`, err);
  }
}

/* ---------------------------
   🤖 BOT READY
----------------------------*/

client.once('ready', async () => {
  console.log('🤖 Bot online');

  const guilds = client.guilds.cache;
  for (const [guildId, guild] of guilds) {
    await registerCommands(guildId, guild.name);
  }
});

// Quando o bot entra em um servidor novo
client.on('guildCreate', async (guild) => {
  console.log(`📥 Bot adicionado em: ${guild.name}`);
  await registerCommands(guild.id, guild.name);
});

/* ---------------------------
   🎮 INTERAÇÕES
----------------------------*/

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'gear') return;

  const sub = interaction.options.getSubcommand();

  // 🔹 SET
  if (sub === 'set') {
    const gs = interaction.options.getInteger('gs', true);
    const familyNameInput = interaction.options.getString('nome_familia');

    const existing = data.find(p => p.userId === interaction.user.id);

    if (existing) {
      // Atualiza gs sempre
      existing.gs = gs;

      // Atualiza nome de família só se foi preenchido
      if (familyNameInput) {
        existing.familyName = familyNameInput;
      }

      save();

      await interaction.reply({
        content: `✅ GS atualizado para **${gs}**\n👨‍👩‍👧 Família: **${existing.familyName}**`,
        ephemeral: true,
      });

    } else {
      // Primeira vez — nome de família obrigatório
      if (!familyNameInput) {
        await interaction.reply({
          content: '❌ É sua primeira vez! Por favor informe seu **nome de família**.',
          ephemeral: true,
        });
        return;
      }

      data.push({
        userId: interaction.user.id,
        name: interaction.user.username,
        familyName: familyNameInput,
        gs,
      });

      save();

      await interaction.reply({
        content: `✅ Cadastrado!\n👨‍👩‍👧 Família: **${familyNameInput}**\n⚔️ GS: **${gs}**`,
        ephemeral: true,
      });
    }
  }

  // 🔹 TOP
  if (sub === 'top') {
    const ranking = getRanking().slice(0, 20);

    let msg = '🏆 **TOP 20 GS**\n\n';

    ranking.forEach((p, i) => {
      const medal =
        i === 0 ? '🥇' :
        i === 1 ? '🥈' :
        i === 2 ? '🥉' : '';

      msg += `${medal} #${i + 1} - ${p.familyName} (${p.gs})\n`;
    });

    await interaction.reply(msg);
  }

  // 🔹 ME
  if (sub === 'me') {
    const ranking = getRanking();

    const index = ranking.findIndex(
      (p) => p.userId === interaction.user.id
    );

    if (index === -1) {
      await interaction.reply({
        content: '❌ Você não está no ranking. Use `/gear set` para se cadastrar!',
        ephemeral: true,
      });
      return;
    }

    const player = ranking[index];

    if (!player) {
      await interaction.reply({
        content: '❌ Erro interno: jogador não encontrado no ranking',
        ephemeral: true,
      });
      return;
    }

    const next = ranking[index - 1];
    const diff = next ? (next.gs - player.gs) : 0;

    await interaction.reply({
      content: `📊 **${player.familyName}**\nPosição: **#${index + 1}**\nGS: **${player.gs}**\n${diff > 0 ? `Falta **${diff} GS** para o próximo` : '🏆 Você está em primeiro!'}`,
      ephemeral: true,
    });
  }
});

/* ---------------------------
   🔑 LOGIN
----------------------------*/

client.login(token);
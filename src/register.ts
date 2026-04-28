import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('gear')
    .setDescription('Sistema de gear')
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Atualizar GS')
        .addIntegerOption(opt =>
          opt.setName('gs')
            .setDescription('Seu gear score')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('top').setDescription('Top 20 GS')
    )
    .addSubcommand(sub =>
      sub.setName('me').setDescription('Seu ranking')
    )
].map(cmd => cmd.toJSON());

const token = process.env.TOKEN;

if (!token) {
  throw new Error("TOKEN não encontrado no .env");
}

const rest = new REST({ version: '10' }).setToken(token);
const CLIENT_ID = '1498391883863294122';

client.once('ready', async () => {
  console.log('Registrando em todas as guilds...');

  const guilds = await client.guilds.fetch();

  for (const [guildId] of guilds) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`✅ Registrado na guild ${guildId}`);
    } catch (err) {
      console.error(`Erro na guild ${guildId}`, err);
    }
  }

  process.exit();
});

client.login(process.env.TOKEN);
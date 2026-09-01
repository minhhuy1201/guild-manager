import { commandDefinitions } from '../modules/discord-bot/discord-bot.public';
import { loadDiscordEnv } from './load-discord-env';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Read one required variable, or explain exactly what to do about it.
 * @param name - Variable name
 * @param envFile - File the variables were read from, named in the error so the fix goes in the
 *   right one — with two applications, `.env` and `.env.production` hold different values
 * @returns Its value
 * @throws Error when the variable is missing or empty
 */
function required(name: string, envFile: string | null): string {
  const value = process.env[name];

  if (!value) {
    const where = envFile
      ? `apps/api/${envFile}`
      : 'môi trường (không có file .env nào được nạp)';

    throw new Error(`Thiếu ${name}. Thêm vào ${where} — xem .env.example.`);
  }

  return value;
}

/**
 * Replace the guild's command list with what `commands/index.ts` declares.
 *
 * Guild scope, not global: guild commands take effect immediately, global ones take up to an hour
 * to propagate, and the bot serves exactly one guild.
 *
 * Local and production are two different Discord Applications, so the target is chosen by env file:
 *
 *   pnpm discord:register                                  → .env
 *   DISCORD_ENV_FILE=.env.production pnpm discord:register  → .env.production
 *
 * Run by hand, never from CI: the list only changes when a command is added or renamed, and
 * Discord rate-limits this route hard.
 *
 * @returns Nothing; logs which application was targeted and the registered names
 * @throws Error when a variable is missing or Discord rejects the request
 */
async function main(): Promise<void> {
  const envFile = loadDiscordEnv();

  const applicationId = required('DISCORD_CLIENT_ID', envFile);
  const guildId = required('DISCORD_GUILD_ID', envFile);
  const botToken = required('DISCORD_BOT_TOKEN', envFile);

  const response = await fetch(
    `${DISCORD_API_BASE}/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandDefinitions),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Discord từ chối (${response.status}): ${await response.text()}`,
    );
  }

  const names = commandDefinitions.map((definition) => definition.name);
  const source = envFile ?? 'biến môi trường có sẵn';

  // Name the application: with two of them, registering against the wrong one looks like a success.
  console.log(
    `Đã đăng ký ${names.length} lệnh cho application ${applicationId} ` +
      `(guild ${guildId}, đọc từ ${source}): ${names.join(', ')}`,
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

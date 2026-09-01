import { existsSync } from 'node:fs';

import { config } from 'dotenv';

import { commandDefinitions } from '../modules/discord-bot/discord-bot.public';

/** Env files in the same order ConfigModule reads them; the first value found wins. */
const ENV_FILES = ['.env.local', '.env'];

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Read one required variable, or explain exactly what to do about it.
 * @param name - Variable name
 * @returns Its value
 * @throws Error when the variable is missing or empty
 */
function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Thiếu ${name}. Thêm vào apps/api/.env — xem .env.example, và chạy lệnh từ thư mục gốc repo.`,
    );
  }

  return value;
}

/**
 * Replace the guild's command list with what `commands/index.ts` declares.
 *
 * Guild scope, not global: guild commands take effect immediately, global ones take up to an hour
 * to propagate, and the bot serves exactly one guild.
 *
 * Run by hand, never from CI: the list only changes when a command is added or renamed, and
 * Discord rate-limits this route hard.
 *
 * @returns Nothing; logs the registered names
 * @throws Error when a variable is missing or Discord rejects the request
 */
async function main(): Promise<void> {
  for (const file of ENV_FILES) {
    if (existsSync(file)) config({ path: file });
  }

  const applicationId = required('DISCORD_CLIENT_ID');
  const guildId = required('DISCORD_GUILD_ID');
  const botToken = required('DISCORD_BOT_TOKEN');

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
  console.log(`Đã đăng ký ${names.length} lệnh: ${names.join(', ')}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

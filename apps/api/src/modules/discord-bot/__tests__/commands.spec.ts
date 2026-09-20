import { commandDefinitions, commands } from '../commands';
import { chaoMungCommand } from '../commands/chao-mung.command';
import { pingCommand } from '../commands/ping.command';
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';

describe('/ping', () => {
  it('trả một tin nhắn thấy được trong kênh', async () => {
    const reply = await pingCommand.execute(
      { type: 2, channel_id: '424242', data: { name: 'ping' } },
      {} as never,
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.content).toContain('Pong');
  });
});

describe('registry lệnh', () => {
  it('chứa /ping', () => {
    expect(commands).toContain(pingCommand);
  });

  it('chứa /chao-mung', () => {
    expect(commands).toContain(chaoMungCommand);
  });

  it('không có hai lệnh trùng tên', () => {
    // Discord accepts both and keeps one; the router looks up a Map and keeps the other. A
    // duplicate name is a command disappearing with nobody reporting it.
    const names = commandDefinitions.map((definition) => definition.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('mọi lệnh đều có mô tả để Discord hiện trong ô chat', () => {
    for (const definition of commandDefinitions) {
      expect(definition.description.length).toBeGreaterThan(0);
    }
  });
});

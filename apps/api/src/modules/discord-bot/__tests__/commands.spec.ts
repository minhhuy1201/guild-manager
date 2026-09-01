import { commandDefinitions, commands } from '../commands';
import { pingCommand } from '../commands/ping.command';
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';

describe('/ping', () => {
  it('trả một tin nhắn thấy được trong kênh', () => {
    const reply = pingCommand.execute({ type: 2, data: { name: 'ping' } });

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.content).toContain('Pong');
  });
});

describe('registry lệnh', () => {
  it('chứa /ping', () => {
    expect(commands).toContain(pingCommand);
  });

  it('không có hai lệnh trùng tên', () => {
    // Discord nhận cả hai và chỉ giữ lại một; router thì tra Map nên giữ lại cái kia. Trùng tên là
    // một lệnh biến mất mà không ai báo.
    const names = commandDefinitions.map((definition) => definition.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('mọi lệnh đều có mô tả để Discord hiện trong ô chat', () => {
    for (const definition of commandDefinitions) {
      expect(definition.description.length).toBeGreaterThan(0);
    }
  });
});

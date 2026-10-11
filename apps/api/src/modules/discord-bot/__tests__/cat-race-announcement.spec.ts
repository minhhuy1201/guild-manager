import { buildCatRaceAnnouncement } from '../cat-race-announcement';

const ANNOUNCEMENT = {
  eventName: 'Quà Trung Thu',
  prizes: [
    {
      name: 'Thiên thưởng',
      winners: [{ discordId: '111', name: 'An' }],
    },
    {
      name: 'Tiền mặt',
      winners: [
        { discordId: null, name: 'Bình' },
        { discordId: '222', name: 'Chi' },
      ],
    },
    { name: 'Thẻ tháng', winners: [] },
  ],
};

describe('buildCatRaceAnnouncement', () => {
  const payload = buildCatRaceAnnouncement(ANNOUNCEMENT);
  const [embed] = payload.embeds ?? [];

  it('titles the embed with the event name', () => {
    expect(embed.title).toBe('Quà Trung Thu');
  });

  it('tags a linked winner and prints the name of an unlinked one', () => {
    expect(embed.description).toContain('**Thiên thưởng**\n<@111>');
    expect(embed.description).toContain('Bình, <@222>');
  });

  it('skips a prize nobody won', () => {
    expect(embed.description).not.toContain('Thẻ tháng');
  });

  it('never mentions tickets', () => {
    expect(JSON.stringify(payload).toLowerCase()).not.toContain('vé');
  });

  it('lets only the tagged ids ping, and pings them in content', () => {
    expect(payload.allowed_mentions).toEqual({ users: ['111', '222'] });
    expect(payload.content).toContain('<@111>');
    expect(payload.content).toContain('<@222>');
    expect(payload.content).not.toContain('Bình');
  });
});

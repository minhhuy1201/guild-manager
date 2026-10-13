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

describe('buildCatRaceAnnouncement limits', () => {
  const winnersOf = (count: number, linked: boolean) =>
    Array.from({ length: count }, (_, index) => ({
      // BigInt: a plain number loses the low digits at this size and the ids collapse into repeats.
      discordId: linked ? String(100000000000000000n + BigInt(index)) : null,
      name: `Người ${index}`,
    }));

  it('cuts the pings to what fits in content and says how many were left out', () => {
    const payload = buildCatRaceAnnouncement({
      eventName: 'Đông',
      prizes: [{ name: 'Tiền mặt', winners: winnersOf(300, true) }],
    });

    expect(payload.content?.length).toBeLessThanOrEqual(2000);
    expect(payload.content).toMatch(/và \d+ người nữa$/);
    expect(payload.allowed_mentions?.users?.length).toBeLessThan(300);
    for (const id of payload.allowed_mentions?.users ?? []) {
      expect(payload.content).toContain(`<@${id}>`);
    }
  });

  it('cuts the prize sections to the embed limit and says how many were left out', () => {
    const payload = buildCatRaceAnnouncement({
      eventName: 'Đông',
      prizes: Array.from({ length: 400 }, (_, index) => ({
        name: `Hạng mục số ${index}`,
        winners: winnersOf(2, false),
      })),
    });

    const [embed] = payload.embeds ?? [];
    expect(embed.description?.length).toBeLessThanOrEqual(4096);
    expect(embed.description).toMatch(/… và \d+ hạng mục nữa\.$/);
  });

  it('sends only the lead line when no winner has a linked Discord', () => {
    const payload = buildCatRaceAnnouncement({
      eventName: 'Đông',
      prizes: [{ name: 'Vé', winners: winnersOf(2, false) }],
    });

    expect(payload.content).not.toContain('<@');
    expect(payload.content).not.toContain('\n');
    expect(payload.allowed_mentions).toEqual({ users: [] });
  });
});

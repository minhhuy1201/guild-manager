import { interactionSchema } from '../interaction.schema';
import { buildLeaveModal, readLeaveModal } from '../leave-modal';
import { vn } from '../../../__tests__/vn-date';

const SUBMIT = {
  type: 5,
  data: {
    custom_id: 'modal:nghi-phep',
    components: [
      {
        type: 18,
        component: { type: 4, custom_id: 'tu-ngay', value: '05/10' },
      },
      {
        type: 18,
        component: { type: 4, custom_id: 'den-ngay', value: '12/10' },
      },
      { type: 18, component: { type: 4, custom_id: 'ly-do', value: '' } },
    ],
  },
  member: { user: { id: '111' } },
};

describe('buildLeaveModal', () => {
  it('trả modal ba ô, "từ ngày" điền sẵn hôm nay dạng dd/mm', () => {
    const reply = buildLeaveModal(vn('2026-10-04T12:00'));

    expect(reply.type).toBe(9);
    expect(reply.data.custom_id).toBe('modal:nghi-phep');
    expect(reply.data.title).toBe('Xin nghỉ');
    expect(reply.data.components).toHaveLength(3);
    expect(
      reply.data.components.map((label) => [
        label.component.custom_id,
        label.component.value,
        label.component.required,
      ]),
    ).toEqual([
      ['tu-ngay', '04/10', true],
      ['den-ngay', undefined, true],
      ['ly-do', undefined, false],
    ]);
  });

  it('giới hạn lý do bằng trần của schema dùng chung', () => {
    const reason = buildLeaveModal(vn('2026-10-04T12:00')).data.components[2];

    expect(reason.component.max_length).toBe(255);
    // A reason is a sentence, so it gets the multi-line box.
    expect(reason.component.style).toBe(2);
  });
});

describe('readLeaveModal', () => {
  it('đọc ba giá trị, ô lý do rỗng thành null', () => {
    const parsed = interactionSchema.parse(SUBMIT);
    if (parsed.type !== 5) throw new Error('expected a modal submit');

    expect(readLeaveModal(parsed)).toEqual({
      from: '05/10',
      to: '12/10',
      reason: null,
    });
  });

  it('giữ lý do khi có nhập', () => {
    const parsed = interactionSchema.parse({
      ...SUBMIT,
      data: {
        ...SUBMIT.data,
        components: [
          ...SUBMIT.data.components.slice(0, 2),
          {
            type: 18,
            component: { type: 4, custom_id: 'ly-do', value: 'du lịch' },
          },
        ],
      },
    });
    if (parsed.type !== 5) throw new Error('expected a modal submit');

    expect(readLeaveModal(parsed).reason).toBe('du lịch');
  });
});

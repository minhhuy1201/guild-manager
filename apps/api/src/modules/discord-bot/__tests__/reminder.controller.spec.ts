import { ReminderController } from '../reminder.controller';

describe('ReminderController', () => {
  // The cron path alerts the admin on failure; /nhac-diem-danh (which calls `run`) must not.
  it('chạy qua runScheduled, không gọi run', async () => {
    const runScheduled = jest.fn().mockResolvedValue({ status: 'nothing-due' });
    const run = jest.fn();
    const controller = new ReminderController({ runScheduled, run } as never);

    await expect(controller.run()).resolves.toEqual({ status: 'nothing-due' });
    expect(runScheduled).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });
});

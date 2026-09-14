import { beforeEach, describe, expect, it } from "vitest";

import { useFormationStore } from "../formation-store";
import { useTeamViewStore } from "../team-view-store";

beforeEach(() => {
  useTeamViewStore.setState(useTeamViewStore.getInitialState());
});

// Trên điện thoại chỉ hiện một team mỗi lúc; team đang xem là trạng thái giao diện, không phải một thay
// đổi của đội hình.
describe("useTeamViewStore", () => {
  it("mặc định xem team 1", () => {
    expect(useTeamViewStore.getInitialState().selectedTeam).toBe(1);
  });

  it("chọn team 3 thì selectedTeam là 3", () => {
    useTeamViewStore.getState().selectTeam(3);

    expect(useTeamViewStore.getState().selectedTeam).toBe(3);
  });

  // Đổi team đang xem mà lọt vào lịch sử thì Ctrl+Z / nút Hoàn tác sẽ "hoàn tác" một lần bấm chip.
  it("đổi team không đụng tới bản nháp và lịch sử hoàn tác", () => {
    const { drafts, history } = useFormationStore.getState();

    useTeamViewStore.getState().selectTeam(4);

    expect(useFormationStore.getState().drafts).toBe(drafts);
    expect(useFormationStore.getState().history).toBe(history);
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import { useFormationStore } from "../formation-store";
import { useTeamViewStore } from "../team-view-store";

beforeEach(() => {
  useTeamViewStore.setState(useTeamViewStore.getInitialState());
});

// A phone shows one team at a time; which team is on screen is interface state, not a change to
// the line-up.
describe("useTeamViewStore", () => {
  it("mặc định xem team 1", () => {
    expect(useTeamViewStore.getInitialState().selectedTeam).toBe(1);
  });

  it("chọn team 3 thì selectedTeam là 3", () => {
    useTeamViewStore.getState().selectTeam(3);

    expect(useTeamViewStore.getState().selectedTeam).toBe(3);
  });

  // If switching the visible team entered the history, Ctrl+Z and the undo button would "undo" a
  // chip press.
  it("đổi team không đụng tới bản nháp và lịch sử hoàn tác", () => {
    const { drafts, history } = useFormationStore.getState();

    useTeamViewStore.getState().selectTeam(4);

    expect(useFormationStore.getState().drafts).toBe(drafts);
    expect(useFormationStore.getState().history).toBe(history);
  });
});

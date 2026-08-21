// @vitest-environment jsdom
import { act } from "@testing-library/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { POOL_DROPPABLE_ID } from "../../lib/dnd-data";
import { useFormationDnd } from "../use-formation-dnd";
import { renderFormationHook } from "./render-formation-hook";

const CHARACTER: Character = {
  id: "char-1",
  name: "An",
  guildClass: GuildClass.TO_VAN,
};

const CHARACTERS_BY_ID = new Map([[CHARACTER.id, CHARACTER]]);
const SLOT = "team-1-pos-1";

/**
 * Build the drag start event dnd-kit would emit for a member card.
 * @param data - Payload attached to the card being dragged
 * @returns An event carrying only the fields the hook reads
 */
function dragStart(data: unknown): DragStartEvent {
  return { active: { data: { current: data } } } as DragStartEvent;
}

/**
 * Build the drag end event dnd-kit would emit when a card is released.
 * @param data - Payload of the card being dragged
 * @param over - Payload of the droppable under the pointer, if any
 * @returns An event carrying only the fields the hook reads
 */
function dragEnd(data: unknown, over?: unknown): DragEndEvent {
  return {
    active: { data: { current: data } },
    over: over === undefined ? null : { data: { current: over } },
  } as DragEndEvent;
}

describe("useFormationDnd", () => {
  it("bắt đầu kéo thì nhớ nhân vật để vẽ overlay", () => {
    const { result } = renderFormationHook(() =>
      useFormationDnd(vi.fn(), CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragStart(
        dragStart({ type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID })
      );
    });

    expect(result.current.activeCharacter).toEqual(CHARACTER);
  });

  it("payload không phải member thì không có gì được kéo", () => {
    const { result } = renderFormationHook(() =>
      useFormationDnd(vi.fn(), CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragStart(dragStart({ type: "slot", slotId: SLOT }));
    });

    expect(result.current.activeCharacter).toBeNull();
  });

  it("thả vào ô trống thì chuyển nguyên cử chỉ cho bản nháp", () => {
    const applyDrop = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationDnd(applyDrop, CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragEnd(
        dragEnd(
          { type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID },
          { type: "slot", slotId: SLOT }
        )
      );
    });

    expect(applyDrop).toHaveBeenCalledWith({ kind: "pool" }, "char-1", {
      kind: "slot",
      slotId: SLOT,
    });
  });

  it("kéo từ một ô ra ngoài lưới thì target là null", () => {
    const applyDrop = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationDnd(applyDrop, CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragEnd(
        dragEnd({ type: "member", characterId: "char-1", from: SLOT })
      );
    });

    expect(applyDrop).toHaveBeenCalledWith(
      { kind: "slot", slotId: SLOT },
      "char-1",
      null
    );
  });

  it("thả xong thì overlay tắt", () => {
    const { result } = renderFormationHook(() =>
      useFormationDnd(vi.fn(), CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragStart(
        dragStart({ type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID })
      );
    });
    act(() => {
      result.current.handleDragEnd(
        dragEnd(
          { type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID },
          { type: "pool" }
        )
      );
    });

    expect(result.current.activeCharacter).toBeNull();
  });

  it("payload hỏng thì không đụng vào bản nháp", () => {
    const applyDrop = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationDnd(applyDrop, CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragEnd(dragEnd(null, { type: "slot", slotId: SLOT }));
    });

    expect(applyDrop).not.toHaveBeenCalled();
  });

  it("huỷ kéo thì overlay tắt", () => {
    const { result } = renderFormationHook(() =>
      useFormationDnd(vi.fn(), CHARACTERS_BY_ID)
    );

    act(() => {
      result.current.handleDragStart(
        dragStart({ type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID })
      );
    });
    act(() => {
      result.current.cancelDrag();
    });

    expect(result.current.activeCharacter).toBeNull();
  });
});

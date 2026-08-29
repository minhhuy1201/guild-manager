// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TEAM_NAME_MAX_LENGTH } from "@guild/shared/schemas";

import { TeamNameField } from "../team-name-field";

afterEach(cleanup);

/**
 * Render the header of team 3, named or not.
 * @param props - Fields to change from the default (an editable, unnamed team)
 * @returns The commit spy the test asserts on
 */
function renderField(
  props: Partial<React.ComponentProps<typeof TeamNameField>> = {}
) {
  const onCommit = vi.fn();
  render(
    <TeamNameField team={3} value="" onCommit={onCommit} {...props} />
  );

  return onCommit;
}

/**
 * The input shown while the header is being edited.
 * @returns The input element
 */
function input(): HTMLInputElement {
  return screen.getByRole("textbox") as HTMLInputElement;
}

/** Open the input the way a user does. */
function startEditing() {
  fireEvent.doubleClick(screen.getByRole("button"));
}

describe("TeamNameField — chế độ đọc", () => {
  it("đội chưa đặt tên thì hiện số đội", () => {
    renderField();

    expect(screen.getByRole("button").textContent).toBe("3");
  });

  it("đội đã đặt tên thì hiện tên", () => {
    renderField({ value: "Thủ nhà" });

    expect(screen.getByRole("button").textContent).toBe("Thủ nhà");
  });

  it("read-only thì không phải nút, không mở được ô nhập", () => {
    renderField({ value: "Thủ nhà", readOnly: true });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Thủ nhà")).toBeTruthy();
  });
});

describe("TeamNameField — mở ô nhập", () => {
  it("nhấn đúp thì mở ô nhập, sẵn tên hiện tại", () => {
    renderField({ value: "Thủ nhà" });
    startEditing();

    expect(input().value).toBe("Thủ nhà");
  });

  it("Enter trên header cũng mở ô nhập, cho người dùng bàn phím", () => {
    renderField({ value: "Thủ nhà" });
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

    expect(input()).toBeTruthy();
  });

  it("Space cũng mở ô nhập", () => {
    renderField();
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });

    expect(input()).toBeTruthy();
  });

  it("phím thường không mở ô nhập", () => {
    renderField();
    fireEvent.keyDown(screen.getByRole("button"), { key: "a" });

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("chặn độ dài ngay khi gõ thay vì báo lỗi sau", () => {
    renderField();
    startEditing();

    expect(input().maxLength).toBe(TEAM_NAME_MAX_LENGTH);
  });
});

describe("TeamNameField — chốt và huỷ", () => {
  it("Enter chốt tên vừa gõ rồi đóng ô nhập", () => {
    const onCommit = renderField();
    startEditing();

    fireEvent.change(input(), { target: { value: "Xung kích" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onCommit).toHaveBeenCalledWith(3, "Xung kích");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("click ra ngoài cũng chốt", () => {
    const onCommit = renderField();
    startEditing();

    fireEvent.change(input(), { target: { value: "Hậu cần" } });
    fireEvent.blur(input());

    expect(onCommit).toHaveBeenCalledWith(3, "Hậu cần");
  });

  it("Escape huỷ, không chốt gì và trả header về tên cũ", () => {
    const onCommit = renderField({ value: "Thủ nhà" });
    startEditing();

    fireEvent.change(input(), { target: { value: "Gõ nhầm" } });
    fireEvent.keyDown(input(), { key: "Escape" });

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("button").textContent).toBe("Thủ nhà");
  });

  it("mở lại sau khi Escape thì ô nhập về tên đã lưu, không giữ chữ đã huỷ", () => {
    renderField({ value: "Thủ nhà" });
    startEditing();
    fireEvent.change(input(), { target: { value: "Gõ nhầm" } });
    fireEvent.keyDown(input(), { key: "Escape" });
    startEditing();

    expect(input().value).toBe("Thủ nhà");
  });

  it("không đổi gì thì không gọi onCommit", () => {
    const onCommit = renderField({ value: "Thủ nhà" });
    startEditing();
    fireEvent.blur(input());

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("xoá trắng tên là một thay đổi thật, phải chốt để về lại số đội", () => {
    const onCommit = renderField({ value: "Thủ nhà" });
    startEditing();

    fireEvent.change(input(), { target: { value: "" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onCommit).toHaveBeenCalledWith(3, "");
  });

  it("gõ thêm khoảng trắng quanh tên cũ không tính là sửa", () => {
    const onCommit = renderField({ value: "Thủ nhà" });
    startEditing();

    fireEvent.change(input(), { target: { value: "  Thủ nhà  " } });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onCommit).not.toHaveBeenCalled();
  });
});

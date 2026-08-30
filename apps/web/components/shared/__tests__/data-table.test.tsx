// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { useTablePagination } from "@/hooks/use-table-pagination";
import type { QueryGroupState } from "@/lib/query-group";
import { DataTable } from "../data-table";

afterEach(cleanup);

/** Enough items to fill three pages at the default size of 10. */
const ITEMS = Array.from({ length: 23 }, (_, index) => `Thành viên ${index + 1}`);

/**
 * Build a query group state with only the fields a case cares about.
 * @param overrides - Fields this case sets
 * @returns A full QueryGroupState
 */
function makeState(overrides: Partial<QueryGroupState> = {}): QueryGroupState {
  return {
    isPending: false,
    isError: false,
    errorMessage: "",
    refetch: vi.fn(),
    ...overrides,
  };
}

interface HarnessProps {
  /** The whole list, before paging. */
  items?: readonly string[];
  /** Query group state for this case. */
  state?: QueryGroupState;
  /** Optional block between the table and the pagination bar. */
  footer?: React.ReactNode;
}

/**
 * Render `DataTable` the way a screen does: real pagination state, one text column.
 * @param props - items, state and the optional footer
 * @returns The table under test
 */
function Harness({ items = ITEMS, state = makeState(), footer }: HarnessProps) {
  const pagination = useTablePagination({ items: [...items] });

  return (
    <DataTable
      header={
        <TableRow>
          <TableHead>Tên</TableHead>
        </TableRow>
      }
      pagination={pagination}
      state={state}
      columns={1}
      renderRow={(name) => (
        <TableRow key={name}>
          <TableCell>{name}</TableCell>
        </TableRow>
      )}
      emptyMessage="Không có gì cả."
      itemLabel="thành viên"
      footer={footer}
    />
  );
}

/**
 * The text of every body row currently drawn.
 * @param container - The render container
 * @returns One string per row
 */
function bodyRowTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("tbody tr")).map(
    (row) => row.textContent ?? ""
  );
}

/**
 * Where the "Trang sau" button sits among the pagination cells.
 * @param container - The render container
 * @returns Its index in the strip, or -1 when it is missing
 */
function indexOfNextButton(container: HTMLElement): number {
  return Array.from(container.querySelectorAll("li")).findIndex(
    (item) => item.querySelector('[aria-label="Trang sau"]') !== null
  );
}

describe("DataTable", () => {
  it("chỉ render đúng một trang 10 hàng, dù danh sách dài hơn", () => {
    const { container } = render(<Harness />);

    const texts = bodyRowTexts(container);
    expect(texts).toHaveLength(10);
    expect(texts[0]).toBe("Thành viên 1");
    expect(texts[9]).toBe("Thành viên 10");
    expect(screen.queryByText("Thành viên 11")).toBeNull();
  });

  it("đổi trang thì đổi tập hàng, trang cuối chỉ còn phần dư", () => {
    const { container } = render(<Harness />);

    fireEvent.click(screen.getByLabelText("Trang sau"));
    expect(bodyRowTexts(container)[0]).toBe("Thành viên 11");

    fireEvent.click(screen.getByLabelText("Về trang cuối"));
    const lastPage = bodyRowTexts(container);
    expect(lastPage).toHaveLength(3);
    expect(lastPage[0]).toBe("Thành viên 21");
  });

  it("nút mũi tên đứng yên khi số trang đổi", () => {
    const { container } = render(<Harness />);

    const atPageOne = indexOfNextButton(container);
    expect(atPageOne).toBeGreaterThan(-1);

    fireEvent.click(screen.getByLabelText("Trang sau"));
    expect(indexOfNextButton(container)).toBe(atPageOne);

    fireEvent.click(screen.getByLabelText("Về trang cuối"));
    expect(indexOfNextButton(container)).toBe(atPageOne);
  });

  it("thanh phân trang đếm đúng tổng số mục và số trang", () => {
    const { container } = render(<Harness />);

    // 23 mục, 10 mục mỗi trang → 3 trang.
    const summary = container.querySelector("p[aria-live='polite']");
    expect(summary?.textContent).toBe("23 thành viên · trang 1/3");

    fireEvent.click(screen.getByLabelText("Trang sau"));
    expect(summary?.textContent).toBe("23 thành viên · trang 2/3");
  });

  it("giao cho TableBodyState cả bốn nhánh: rỗng, lỗi, đang tải, có dữ liệu", () => {
    const { container: onEmpty } = render(<Harness items={[]} />);
    expect(screen.getByText("Không có gì cả.")).toBeTruthy();
    expect(bodyRowTexts(onEmpty)).toHaveLength(1);

    cleanup();

    render(
      <Harness state={makeState({ isError: true, errorMessage: "Hỏng rồi." })} />
    );
    expect(screen.getByText("Hỏng rồi.")).toBeTruthy();
    expect(screen.queryByText("Thành viên 1")).toBeNull();

    cleanup();

    const { container: onPending } = render(
      <Harness state={makeState({ isPending: true })} />
    );
    expect(
      onPending.querySelectorAll('[data-slot="skeleton"]').length
    ).toBeGreaterThan(0);
  });

  it("render footer giữa bảng và thanh phân trang", () => {
    const { container } = render(
      <Harness footer={<p>Lưu không được.</p>} />
    );

    const footer = screen.getByText("Lưu không được.");
    const table = container.querySelector("table");
    const pagination = container.querySelector('nav[aria-label="pagination"]');

    // compareDocumentPosition: FOLLOWING means the argument comes after the node.
    expect(
      table!.compareDocumentPosition(footer) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      footer.compareDocumentPosition(pagination!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

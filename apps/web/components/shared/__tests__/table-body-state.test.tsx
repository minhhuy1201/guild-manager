// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { QueryGroupState } from "@/lib/query-group";
import { TableBodyState } from "../table-body-state";

afterEach(cleanup);

const COLUMNS = 4;

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

/**
 * Render the component inside a real table, which is where it must live.
 * @param state - Query group state for this case
 * @param rows - Rows of the current page
 * @returns The testing-library render result
 */
function renderInTable(state: QueryGroupState, rows: readonly string[]) {
  return render(
    <Table>
      <TableBody>
        <TableBodyState
          state={state}
          columns={COLUMNS}
          rows={rows}
          emptyMessage="Không có gì cả."
          renderRow={(name) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
            </TableRow>
          )}
        />
      </TableBody>
    </Table>
  );
}

describe("TableBodyState", () => {
  it("lỗi thắng đang-tải", () => {
    const { container } = renderInTable(
      makeState({ isError: true, isPending: true, errorMessage: "Hỏng rồi." }),
      []
    );

    expect(screen.getByText("Hỏng rồi.")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
  });

  it("đang tải thì render đúng skeletonRows hàng, mỗi hàng đủ số cột", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableBodyState
            state={makeState({ isPending: true })}
            columns={COLUMNS}
            skeletonRows={3}
            rows={[]}
            emptyMessage="Không có gì cả."
            renderRow={() => null}
          />
        </TableBody>
      </Table>
    );

    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(3);
    expect(bodyRows[0].querySelectorAll("td")).toHaveLength(COLUMNS);
  });

  it("rỗng khác có-dữ-liệu", () => {
    renderInTable(makeState(), []);
    expect(screen.getByText("Không có gì cả.")).toBeTruthy();

    cleanup();

    renderInTable(makeState(), ["Mèo Mập"]);
    expect(screen.getByText("Mèo Mập")).toBeTruthy();
    expect(screen.queryByText("Không có gì cả.")).toBeNull();
  });

  it("colSpan bằng columns ở cả hàng lỗi lẫn hàng rỗng", () => {
    const { container: onError } = renderInTable(
      makeState({ isError: true, errorMessage: "Hỏng rồi." }),
      []
    );
    expect(onError.querySelector("td")?.getAttribute("colspan")).toBe(
      String(COLUMNS)
    );

    cleanup();

    const { container: onEmpty } = renderInTable(makeState(), []);
    expect(onEmpty.querySelector("td")?.getAttribute("colspan")).toBe(
      String(COLUMNS)
    );
  });

  it("áp class riêng theo chỉ số cột cho hàng skeleton", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableBodyState
            state={makeState({ isPending: true })}
            columns={COLUMNS}
            columnClassNames={[undefined, undefined, undefined, "hidden"]}
            skeletonRows={1}
            rows={[]}
            emptyMessage="Không có gì cả."
            renderRow={() => null}
          />
        </TableBody>
      </Table>
    );

    const cells = container.querySelectorAll("tbody td");
    expect(cells[3].classList.contains("hidden")).toBe(true);
    expect(cells[0].classList.contains("hidden")).toBe(false);
  });
});

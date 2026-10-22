// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableFrame } from "../data-table-frame";

afterEach(cleanup);

describe("DataTableFrame", () => {
  it("draws its rows inside the framed table", () => {
    render(
      <DataTableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Mèo Mập</TableCell>
          </TableRow>
        </TableBody>
      </DataTableFrame>
    );

    const frame = document.querySelector("[data-slot='data-table-frame']") as HTMLElement;

    expect(frame.contains(screen.getByRole("table"))).toBe(true);
    expect(screen.getByRole("columnheader", { name: "Tên" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Mèo Mập" })).toBeTruthy();
  });
});

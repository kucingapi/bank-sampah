import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/shared/ui/ui/table";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { ExportCSVButton } from "@/shared/ui/ExportCSVButton";
import { exportToCSV } from "@/shared/lib/csv";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  enableExport?: boolean;
  exportFilename?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  enableExport = false,
  exportFilename = "export",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState("");

  const exportData = useMemo(() => {
    return data.map((row) => {
      const rowData: Record<string, any> = {};
      columns.forEach((col) => {
        const accessorKey = (col as any).accessorKey;
        if (accessorKey) {
          const value = row[accessorKey as keyof TData];
          if (value !== undefined && value !== null) {
            if (typeof value === "object") {
              if (value instanceof Date) {
                rowData[accessorKey] = value.toISOString();
              } else if ("toString" in value) {
                rowData[accessorKey] = String(value);
              }
            } else {
              rowData[accessorKey] = value;
            }
          }
        }
      });
      return rowData;
    });
  }, [data, columns]);

  const handleExport = () => {
    exportToCSV(exportData, exportFilename);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  // Apply search filter if searchKey and searchValue provided
  useEffect(() => {
    if (searchKey) {
      const column = table.getColumn(searchKey);
      column?.setFilterValue(searchValue);
    }
  }, [searchKey, searchValue, table]);



  return (
    <div className="flex flex-col gap-4">
      {(enableExport || searchKey) && (
        <div className="flex items-center justify-between gap-4">
          {searchKey && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <div className="flex-1" />
          {enableExport && (
            <ExportCSVButton onExport={handleExport} filename={exportFilename} />
          )}
        </div>
      )}
      <div className="rounded-lg border border-input overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={() => {
                      if (header.column.getCanSort()) {
                        header.column.toggleSorting();
                      }
                    }}
                    className={header.column.getCanSort() ? "cursor-pointer" : ""}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Tidak ada data yang ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            data-icon="inline-start"
          >
            <ChevronLeft /> Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            data-icon="inline-end"
          >
            Selanjutnya <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

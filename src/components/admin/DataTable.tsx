import { ReactNode, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminTranslations } from "@/constants/adminTranslations";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  pageSize?: number;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  pageSize = 20,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 w-full" dir="rtl">
      <div className="border rounded-lg overflow-hidden relative">
        {/* Scroll indicator for mobile */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 opacity-0 md:opacity-0 transition-opacity" id="scroll-indicator-left" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 md:hidden" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {columns.map((column, index) => (
                  <TableHead key={index} className="font-semibold whitespace-nowrap text-right">
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-12"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="font-medium">{adminTranslations.common.noData}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} 
                      transition-colors
                    `}
                  >
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex} className="whitespace-nowrap">
                        {column.cell
                          ? column.cell(item)
                          : column.accessorKey
                          ? String(item[column.accessorKey] || "")
                          : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            {adminTranslations.common.showing} {startIndex + 1} {adminTranslations.common.to} {Math.min(endIndex, data.length)} {adminTranslations.common.of}{" "}
            {data.length} {adminTranslations.common.results}
          </p>
          <div className="flex gap-2 items-center order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-3 text-sm whitespace-nowrap">
              {adminTranslations.common.page} {currentPage} {adminTranslations.common.of} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

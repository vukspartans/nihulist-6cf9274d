import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableRow, TableCell } from "@/components/ui/table";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
}

interface SortableTableRowProps<T extends { id: string }> {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

export function SortableTableRow<T extends { id: string }>({
  item,
  columns,
  onRowClick,
}: SortableTableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`
        ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} 
        ${isDragging ? "opacity-50 bg-muted/30 shadow-lg z-50" : ""}
        transition-colors
      `}
      onClick={() => !isDragging && onRowClick?.(item)}
    >
      {/* Drag Handle */}
      <TableCell className="w-10 px-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>

      {/* Data Cells */}
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
  );
}

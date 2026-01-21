import { useState, useEffect, ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { adminTranslations } from "@/constants/adminTranslations";
import { SortableTableRow } from "./SortableTableRow";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
}

interface SortableDataTableProps<T extends { id: string; display_order: number }> {
  data: T[];
  columns: Column<T>[];
  onReorder?: (orderedIds: { id: string; display_order: number }[]) => void;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  isReordering?: boolean;
}

export function SortableDataTable<T extends { id: string; display_order: number }>({
  data,
  columns,
  onReorder,
  onRowClick,
  pageSize = 20,
  isReordering = false,
}: SortableDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>(data);

  // Sync local items with data prop when it changes
  useEffect(() => {
    setItems(data);
  }, [data]);

  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = items.slice(startIndex, endIndex);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      setItems(reorderedItems);

      // Calculate new display_order values
      const orderedIds = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }));

      onReorder?.(orderedIds);
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <div className={`space-y-4 w-full ${isReordering ? "opacity-70 pointer-events-none" : ""}`} dir="rtl">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="border rounded-lg overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 md:hidden" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {/* Drag Handle Header */}
                  <TableHead className="w-10 px-2" />
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
                      colSpan={columns.length + 1}
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
                  <SortableContext
                    items={currentData.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {currentData.map((item) => (
                      <SortableTableRow
                        key={item.id}
                        item={item}
                        columns={columns}
                        onRowClick={onRowClick}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem ? (
            <div className="bg-background border rounded-md shadow-lg p-3 flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {/* Show first column cell content */}
                {columns[0]?.cell
                  ? columns[0].cell(activeItem)
                  : columns[0]?.accessorKey
                  ? String(activeItem[columns[0].accessorKey] || "")
                  : activeItem.id}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            {adminTranslations.common.showing} {startIndex + 1} {adminTranslations.common.to}{" "}
            {Math.min(endIndex, items.length)} {adminTranslations.common.of} {items.length}{" "}
            {adminTranslations.common.results}
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

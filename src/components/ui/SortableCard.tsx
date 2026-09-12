"use client";

import { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface SortableContextValue {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}

const SortableItemContext = createContext<SortableContextValue | null>(null);

interface SortableCardProps {
  id: string;
  isPinned?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SortableCard({
  id,
  isPinned = false,
  children,
  className = "",
}: SortableCardProps) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id,
    data: { isPinned },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SortableItemContext.Provider value={{ attributes, listeners }}>
      <Card
        ref={setNodeRef}
        style={style}
        className={`overflow-hidden ${isPinned ? "ring-2 ring-orange-400 bg-orange-50" : ""} ${className}`}
      >
        {children}
      </Card>
    </SortableItemContext.Provider>
  );
}

interface DragHandleProps {
  className?: string;
  iconSize?: number;
}

export function DragHandle({ className = "", iconSize = 16 }: DragHandleProps) {
  const context = useContext(SortableItemContext);
  if (!context) {
    throw new Error("DragHandle must be used within a SortableCard");
  }

  return (
    <div
      className={`cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none ${className}`}
      title="拖曳排序"
      {...context.attributes}
      {...context.listeners}
    >
      <GripVertical size={iconSize} />
    </div>
  );
}

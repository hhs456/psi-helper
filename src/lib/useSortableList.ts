import { useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/browser";

export interface SortableItem {
  id: string;
  is_pinned: boolean;
  sort_order: number;
}

interface UseSortableListOptions<T extends SortableItem> {
  items: T[];
  tableName: string;
  getGroupKey?: (item: T) => string;
  onReorder: (newItems: T[]) => void;
  revalidate?: () => Promise<unknown>;
}

export function useSortableList<T extends SortableItem>({
  items,
  tableName,
  getGroupKey = (item) => String(item.is_pinned),
  onReorder,
  revalidate,
}: UseSortableListOptions<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overItem = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;

    if (getGroupKey(activeItem) !== getGroupKey(overItem)) return;

    const groupKey = getGroupKey(activeItem);
    const groupItems = items.filter((i) => getGroupKey(i) === groupKey);
    const oldIndex = groupItems.findIndex((i) => i.id === active.id);
    const newIndex = groupItems.findIndex((i) => i.id === over.id);

    const reorderedGroup = arrayMove(groupItems, oldIndex, newIndex);

    const pinnedGroup = reorderedGroup.filter((i) => i.is_pinned);
    const unpinnedGroup = reorderedGroup.filter((i) => !i.is_pinned);
    const orderedItems = [...pinnedGroup, ...unpinnedGroup];

    const updates = orderedItems.map((item, idx) => ({
      id: item.id,
      sort_order: orderedItems.length - idx,
    }));

    const newItems: T[] = [];
    let groupIdx = 0;
    for (const item of items) {
      if (getGroupKey(item) === groupKey) {
        const reordered = reorderedGroup[groupIdx];
        const update = updates.find((u) => u.id === reordered.id);
        newItems.push(update ? { ...reordered, sort_order: update.sort_order } : reordered);
        groupIdx++;
      } else {
        newItems.push(item);
      }
    }

    onReorder(newItems);

    const supabase = createClient();
    const { error } = await supabase.rpc("batch_update_sort_order", {
      p_table_name: tableName,
      p_items: updates,
    });

    if (error) console.error("排序更新失敗:", error);

    await revalidate?.();
  }

  return { sensors, handleDragEnd };
}

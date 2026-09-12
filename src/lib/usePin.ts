import { createClient } from "@/lib/supabase/browser";
import type { SortableItem } from "@/lib/useSortableList";

interface UsePinOptions<T extends SortableItem> {
  items: T[];
  tableName: string;
  onUpdate: (updatedItems: T[]) => void;
}

export function usePin<T extends SortableItem>({
  items,
  tableName,
  onUpdate,
}: UsePinOptions<T>) {
  async function handlePin(id: string, currentIsPinned: boolean) {
    const supabase = createClient();

    const updateData: Record<string, boolean | number> = {
      is_pinned: !currentIsPinned,
    };
    if (!currentIsPinned) {
      const maxOrder = Math.max(...items.map((i) => i.sort_order), 0);
      updateData.sort_order = maxOrder + 1;
    }

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", id);

    if (error) {
      alert("操作失敗：" + error.message);
      return;
    }

    onUpdate(
      items.map((item) =>
        item.id === id ? { ...item, ...updateData } : item
      ) as T[]
    );
  }

  return { handlePin };
}

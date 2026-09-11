"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Trash2, Warehouse, Pin, PinOff, GripVertical, Search, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSuppliers } from "@/lib/hooks";
import type { Supplier } from "@/types";

function SortableSupplierCard({
  supplier,
  onPin,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onPin: (id: string, isPinned: boolean) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: supplier.id,
    data: { isPinned: supplier.is_pinned },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 ${supplier.is_pinned ? "ring-2 ring-orange-400 bg-orange-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 mt-0.5 text-gray-400 hover:text-gray-600 touch-none"
            title="拖曳排序"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </div>
          <div>
            <Link href={`/suppliers/${supplier.id}`}>
              <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">{supplier.name}</h3>
            </Link>
            {supplier.contact && (
              <p className="text-sm text-gray-500 mt-1">{supplier.contact}</p>
            )}
            {supplier.notes && (
              <p className="text-sm text-gray-500 mt-1">{supplier.notes}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onPin(supplier.id, supplier.is_pinned)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={supplier.is_pinned ? "取消釘選" : "釘選"}
          >
            {supplier.is_pinned ? (
              <PinOff size={16} className="text-orange-500" />
            ) : (
              <Pin size={16} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onEdit(supplier)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Edit2 size={16} className="text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(supplier.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>
    </Card>
  );
}

export function SuppliersClient() {
  const { suppliers, isLoading, error, mutate } = useSuppliers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: "", contact: "", notes: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">載入失敗：{error.message}</div>;
  }

  function openModal(supplier?: Supplier) {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact: supplier.contact || "",
        notes: supplier.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: "", contact: "", notes: "" });
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData({ name: "", contact: "", notes: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    if (editingSupplier) {
      const { error } = await supabase
        .from("suppliers")
        .update(formData)
        .eq("id", editingSupplier.id);

      if (error) {
        alert("更新失敗：" + error.message);
        return;
      }
    } else {
      const maxOrder = Math.max(...suppliers.map((s) => s.sort_order), 0);
      const { error } = await supabase.from("suppliers").insert([{
        ...formData,
        sort_order: maxOrder + 1,
      }]);

      if (error) {
        alert("新增失敗：" + error.message);
        return;
      }
    }

    closeModal();
    await mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此供應商嗎？")) return;

    const supabase = createClient();
    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    await mutate();
  }

  async function handlePin(id: string, currentIsPinned: boolean) {
    const supabase = createClient();

    const updateData: Record<string, boolean | number> = {
      is_pinned: !currentIsPinned,
    };
    if (!currentIsPinned) {
      const maxOrder = Math.max(...suppliers.map((s) => s.sort_order), 0);
      updateData.sort_order = maxOrder + 1;
    }

    const { error } = await supabase
      .from("suppliers")
      .update(updateData)
      .eq("id", id);

    if (error) {
      alert("操作失敗：" + error.message);
      return;
    }

    await mutate();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeItem = suppliers.find((s) => s.id === active.id);
    const overItem = suppliers.find((s) => s.id === over.id);

    if (!activeItem || !overItem) return;

    if (activeItem.is_pinned !== overItem.is_pinned) return;

    const oldIndex = suppliers.findIndex((s) => s.id === active.id);
    const newIndex = suppliers.findIndex((s) => s.id === over.id);

    const newSuppliers = arrayMove(suppliers, oldIndex, newIndex);

    const supabase = createClient();
    const pinnedGroup = newSuppliers.filter((s) => s.is_pinned);
    const unpinnedGroup = newSuppliers.filter((s) => !s.is_pinned);

    const updates = [...pinnedGroup, ...unpinnedGroup].map((item, idx) => ({
      id: item.id,
      sort_order: newSuppliers.length - idx,
    }));

    const { error } = await supabase.rpc("batch_update_sort_order", {
      p_table_name: "suppliers",
      p_items: updates,
    });

    if (error) {
      console.error("排序更新失敗:", error);
    } else {
      await mutate();
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
    return supplier.name.toLowerCase().includes(query);
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => openModal()}>
          <Plus size={16} className="mr-2" />
          新增供應商
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋供應商名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Warehouse size={48} className="mb-4" />
          <p className="text-lg">{suppliers.length === 0 ? "尚無供應商資料" : "找不到符合條件的供應商"}</p>
          {suppliers.length === 0 && (
            <p className="text-sm mt-2">點擊上方按鈕新增第一個供應商</p>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredSuppliers.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <SortableSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onPin={handlePin}
                  onEdit={openModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSupplier ? "編輯供應商" : "新增供應商"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="供應商名稱"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="聯絡方式"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button type="submit">{editingSupplier ? "更新" : "新增"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Trash2, Warehouse, ExternalLink, Pin, PinOff, GripVertical, Search } from "lucide-react";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: "", contact: "", notes: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    } finally {
      setLoading(false);
    }
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
        .update({
          ...formData,
          sort_order: editingSupplier.sort_order,
          is_pinned: editingSupplier.is_pinned,
        })
        .eq("id", editingSupplier.id);

      if (error) {
        alert("更新失敗：" + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("suppliers").insert([formData]);

      if (error) {
        alert("新增失敗：" + error.message);
        return;
      }
    }

    closeModal();
    fetchSuppliers();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此供應商嗎？")) return;

    const supabase = createClient();
    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    fetchSuppliers();
  }

  async function handlePin(id: string, currentIsPinned: boolean) {
    const supabase = createClient();
    const maxOrder = Math.max(...suppliers.map((s) => s.sort_order), 0);
    
    const { error } = await supabase
      .from("suppliers")
      .update({
        is_pinned: !currentIsPinned,
        sort_order: !currentIsPinned ? maxOrder + 1 : 0,
      })
      .eq("id", id);

    if (error) {
      alert("操作失敗：" + error.message);
      return;
    }

    fetchSuppliers();
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    dragNodeRef.current = e.currentTarget as HTMLElement;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragNodeRef.current && dragNodeRef.current !== e.currentTarget) {
      setDragOverIndex(index);
    }
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedItem = suppliers[dragIndex];
    const targetItem = suppliers[dropIndex];

    if (draggedItem.is_pinned !== targetItem.is_pinned) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSuppliers = [...suppliers];
    newSuppliers.splice(dragIndex, 1);
    newSuppliers.splice(dropIndex, 0, draggedItem);

    setSuppliers(newSuppliers);
    setDragIndex(null);
    setDragOverIndex(null);

    const supabase = createClient();
    const pinnedGroup = newSuppliers.filter((s) => s.is_pinned);
    const unpinnedGroup = newSuppliers.filter((s) => !s.is_pinned);

    const updates = [...pinnedGroup, ...unpinnedGroup].map((item, idx) => ({
      id: item.id,
      sort_order: newSuppliers.length - idx,
    }));

    for (const update of updates) {
      await supabase
        .from("suppliers")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
    return supplier.name.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">供應商管理</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const actualIndex = suppliers.findIndex((s) => s.id === supplier.id);
            
            return (
              <Card
                key={supplier.id}
                className={`p-4 transition-all ${
                  supplier.is_pinned ? "ring-2 ring-orange-400 bg-orange-50" : ""
                } ${dragOverIndex === actualIndex ? "ring-2 ring-blue-400 scale-[1.02]" : ""} ${
                  dragIndex === actualIndex ? "opacity-50" : ""
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, actualIndex)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, actualIndex)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 -ml-1 mt-0.5 text-gray-400 hover:text-gray-600"
                      title="拖曳排序"
                    >
                      <GripVertical size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
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
                      onClick={() => handlePin(supplier.id, supplier.is_pinned)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      title={supplier.is_pinned ? "取消釘選" : "釘選"}
                    >
                      {supplier.is_pinned ? (
                        <PinOff size={16} className="text-orange-500" />
                      ) : (
                        <Pin size={16} className="text-gray-400" />
                      )}
                    </button>
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink size={16} className="text-blue-600" />
                    </Link>
                    <button
                      onClick={() => openModal(supplier)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
    </div>
  );
}

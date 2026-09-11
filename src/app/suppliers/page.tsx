"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Trash2, Warehouse, ExternalLink, Pin, PinOff, ChevronUp, ChevronDown } from "lucide-react";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: "", contact: "", notes: "" });

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
        .update(formData)
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

  async function handleSort(id: string, direction: "up" | "down") {
    const supabase = createClient();
    const currentIndex = suppliers.findIndex((s) => s.id === id);
    if (currentIndex === -1) return;

    const currentItem = suppliers[currentIndex];
    let targetItem: Supplier | null = null;

    if (direction === "up") {
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (suppliers[i].is_pinned === currentItem.is_pinned) {
          targetItem = suppliers[i];
          break;
        }
      }
    } else {
      for (let i = currentIndex + 1; i < suppliers.length; i++) {
        if (suppliers[i].is_pinned === currentItem.is_pinned) {
          targetItem = suppliers[i];
          break;
        }
      }
    }

    if (!targetItem) return;

    const { error } = await supabase
      .from("suppliers")
      .update({ sort_order: targetItem.sort_order })
      .eq("id", id);

    if (error) {
      alert("排序失敗：" + error.message);
      return;
    }

    const { error: error2 } = await supabase
      .from("suppliers")
      .update({ sort_order: currentItem.sort_order })
      .eq("id", targetItem.id);

    if (error2) {
      alert("排序失敗：" + error2.message);
      return;
    }

    fetchSuppliers();
  }

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

      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Warehouse size={48} className="mb-4" />
          <p className="text-lg">尚無供應商資料</p>
          <p className="text-sm mt-2">點擊上方按鈕新增第一個供應商</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier, index) => {
            const canMoveUp = suppliers.slice(0, index).some((s) => s.is_pinned === supplier.is_pinned);
            const canMoveDown = suppliers.slice(index + 1).some((s) => s.is_pinned === supplier.is_pinned);
            
            return (
              <Card
                key={supplier.id}
                className={`p-4 ${supplier.is_pinned ? "ring-2 ring-orange-400 bg-orange-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                    {supplier.contact && (
                      <p className="text-sm text-gray-500 mt-1">{supplier.contact}</p>
                    )}
                    {supplier.notes && (
                      <p className="text-sm text-gray-500 mt-1">{supplier.notes}</p>
                    )}
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
                <div className="flex justify-end gap-1 mt-2">
                  <button
                    onClick={() => handleSort(supplier.id, "up")}
                    disabled={!canMoveUp}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleSort(supplier.id, "down")}
                    disabled={!canMoveDown}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} className="text-gray-600" />
                  </button>
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

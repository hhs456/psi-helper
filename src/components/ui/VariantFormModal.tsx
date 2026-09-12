"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";

export type VariantFormMode = "add-color" | "add-size" | "edit";

interface VariantFormModalProps {
  mode: VariantFormMode;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { color: string; size: string }) => void | Promise<void>;
  initialValues: { color: string; size: string };
  lockedSize?: string | null;
}

const availableSizes = ["XS", "S", "M", "L", "XL", "2L", "3L", "4L", "均碼"];

export function VariantFormModal({
  mode,
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  lockedSize = null,
}: VariantFormModalProps) {
  const [form, setForm] = useState(initialValues);

  const title = mode === "edit" ? "編輯款式" : "新增款式";
  const submitLabel = mode === "edit" ? "儲存" : "新增";
  const isSizeLocked = mode === "add-color" && lockedSize;
  const sizeDisplayText = isSizeLocked
    ? `${title} - 尺寸：${lockedSize}`
    : title;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const handleClose = () => {
    setForm({ color: "", size: "" });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={sizeDisplayText}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            尺寸
          </label>
          {isSizeLocked ? (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600">
              {lockedSize}
            </div>
          ) : (
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">選擇尺寸</option>
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        <Input
          label="顏色"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          required
        />

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            取消
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

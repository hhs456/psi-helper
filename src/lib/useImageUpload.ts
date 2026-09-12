import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { compressImage, deleteProductImage } from "@/lib/image";

export function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;

    const supabase = createClient();
    let fileToUpload: Blob = imageFile;
    try {
      fileToUpload = await compressImage(imageFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
      });
    } catch (err) {
      console.warn("Image compression failed, using original:", err);
    }

    const fileName = `${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, fileToUpload, { contentType: "image/jpeg" });

    if (error) {
      alert("圖片上傳失敗：" + error.message);
      return null;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return data.publicUrl;
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  function setImagePreviewFromUrl(url: string | null) {
    setImagePreview(url);
    setImageFile(null);
  }

  async function deleteImage(imageUrl: string | null): Promise<void> {
    await deleteProductImage(imageUrl);
  }

  return { imageFile, imagePreview, handleImageChange, uploadImage, clearImage, setImagePreviewFromUrl, deleteImage };
}

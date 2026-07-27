"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Image, Upload, Star, Trash2, MoveUp, MoveDown } from "lucide-react";

export default function ImagesPage() {
  const { id } = useParams();
  const fileRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.data);
        setImages(data.data.images || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", id);

      const res = await fetch("/api/products/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Image uploaded!");
        fetchProduct();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setPrimary = async (imageId) => {
    try {
      await fetch(`/api/products/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      toast.success("Primary image set!");
      fetchProduct();
    } catch {
      toast.error("Failed to update");
    }
  };

  const deleteImage = async (imageId) => {
    if (!confirm("Delete this image?")) return;
    try {
      await fetch(`/api/products/images/${imageId}`, { method: "DELETE" });
      toast.success("Image deleted");
      fetchProduct();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const moveImage = async (imageId, direction) => {
    try {
      await fetch(`/api/products/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: direction }),
      });
      fetchProduct();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/supplier/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" /> Product Images
          </h1>
          <p className="text-muted-foreground">{product?.name}</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>
          <Upload className="h-4 w-4 mr-2" /> Upload Image
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {images.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No images</h3>
          <p className="text-muted-foreground mb-4">Upload product images to showcase your product</p>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Upload First Image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.sort((a, b) => a.sortOrder - b.sortOrder).map((img, index) => (
            <div key={img.id} className={`bg-background rounded-xl border overflow-hidden ${img.isPrimary ? "ring-2 ring-primary" : ""}`}>
              <div className="aspect-square bg-muted flex items-center justify-center">
                <img src={img.url} alt={img.alt || product?.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {img.isPrimary ? (
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Star className="h-3 w-3 fill-current" /> Primary
                      </span>
                    ) : (
                      `Image ${index + 1}`
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!img.isPrimary && (
                    <button onClick={() => setPrimary(img.id)} className="p-1.5 hover:bg-muted rounded" title="Set as primary">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => moveImage(img.id, -1)} className="p-1.5 hover:bg-muted rounded" title="Move up" disabled={index === 0}>
                    <MoveUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => moveImage(img.id, 1)} className="p-1.5 hover:bg-muted rounded" title="Move down" disabled={index === images.length - 1}>
                    <MoveDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteImage(img.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded ml-auto">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
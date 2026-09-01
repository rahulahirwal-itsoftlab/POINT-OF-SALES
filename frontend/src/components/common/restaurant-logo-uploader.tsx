"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, UploadCloud, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getImageUrl } from "@/lib/images/image-url";
import { cn } from "@/lib/utils/cn";

export type RestaurantLogoUploaderProps = {
  value?: string | null;
  selectedFile?: File | null;
  onFileSelect: (file: File | null) => void;
  onRemoveLogo?: () => void;
  isUploading?: boolean;
  className?: string;
  error?: string | null;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);
const MAX_FILE_SIZE_MB = 5;
const MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function RestaurantLogoUploader({
  value,
  selectedFile,
  onFileSelect,
  onRemoveLogo,
  isUploading = false,
  className,
  error,
}: RestaurantLogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setLocalPreview(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setLocalPreview(null);
    }
  }, [selectedFile]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are supported.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error(`Image size must be less than ${MAX_FILE_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    onFileSelect(file);
  }

  function handleRemove() {
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onRemoveLogo) onRemoveLogo();
  }

  const previewSource = localPreview || (value ? getImageUrl(value) : null);

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-sm font-semibold text-slate-800">
        Restaurant Logo
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition duration-200 hover:border-slate-300">
        {/* Preview Box */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
              <span className="mt-1 text-[10px] font-medium">Uploading...</span>
            </div>
          ) : previewSource ? (
            <Image
              src={previewSource}
              alt="Restaurant Logo Preview"
              fill
              sizes="96px"
              className="object-cover transition"
              unoptimized={previewSource.startsWith("data:") || previewSource.startsWith("blob:")}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
              <ImagePlus className="h-7 w-7 text-slate-300" />
              <span className="mt-1 text-[10px] font-medium text-slate-400">No Logo</span>
            </div>
          )}
        </div>

        {/* Info & Action Buttons */}
        <div className="flex flex-1 flex-col justify-center gap-2 text-center sm:text-left">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {selectedFile ? selectedFile.name : previewSource ? "Current Logo Set" : "Upload Restaurant Logo"}
            </p>
            <p className="text-xs text-slate-500">
              Supported: PNG, JPG, JPEG, WEBP (Max {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="heritage-button-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition disabled:opacity-60"
            >
              {previewSource ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Change Image</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload Logo</span>
                </>
              )}
            </button>

            {previewSource && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

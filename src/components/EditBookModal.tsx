"use client";

import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";

interface EditBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: string;
    title: string;
    coverImage?: string;
  };
  onUpdate: (updates: { title?: string; coverImage?: string }) => void;
}

export default function EditBookModal({
  isOpen,
  onClose,
  book,
  onUpdate,
}: EditBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    book.coverImage || null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }

      setCoverImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);

    try {
      const updates: { title?: string; coverImage?: string } = {};

      // Handle title update
      if (title !== book.title) {
        updates.title = title;
      }

      // Handle cover image upload
      if (coverImage) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        setUploadProgress(30);

        // Upload to Supabase Storage
        const fileExt = coverImage.name.split(".").pop();
        const fileName = `${book.id}_${Date.now()}.${fileExt}`; // Use underscore to separate book ID from timestamp
        const filePath = fileName; // Just the filename, no folder needed

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("covers") // Use the covers bucket
          .upload(filePath, coverImage, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        setUploadProgress(60);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("covers").getPublicUrl(filePath); // Use covers bucket

        updates.coverImage = publicUrl;
      }

      setUploadProgress(80);

      // Update book in database
      if (Object.keys(updates).length > 0) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`/api/books/${book.id}/update`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update book");
        }

        setUploadProgress(100);
        onUpdate(updates);
        alert("Book updated successfully!");
        onClose();
      } else {
        alert("No changes to save");
      }
    } catch (error) {
      console.error("Failed to update book:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update book. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-accent/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-accent">Edit Book</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-text-light/70 hover:text-text-light transition"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-text-light mb-2">
              Book Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="w-full px-4 py-3 bg-background border border-surface rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
              placeholder="Enter book title"
              required
            />
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="block text-sm font-medium text-text-light mb-2">
              Cover Image
            </label>
            <div className="flex gap-4 items-start">
              {/* Preview */}
              <div className="flex-shrink-0">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-32 h-48 object-cover rounded-lg border-2 border-surface"
                  />
                ) : (
                  <div className="w-32 h-48 bg-surface/50 rounded-lg border-2 border-dashed border-surface flex items-center justify-center">
                    <div className="text-center text-text-light/50">
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                      <p className="text-xs">No cover</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  disabled={uploading}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-accent hover:bg-accent/90 text-background rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {coverImage ? "Change Image" : "Upload Cover"}
                </button>
                <p className="text-xs text-text-light/60 mt-2">
                  Recommended: 800x1200px or similar 2:3 ratio
                  <br />
                  Max size: 5MB • Formats: JPG, PNG, WebP
                </p>
                {coverImage && (
                  <p className="text-sm text-accent mt-2">
                    Selected: {coverImage.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-text-light">
                <span>Updating book...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="bg-background rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-3 bg-surface hover:bg-surface/80 text-text-light rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || (title === book.title && !coverImage)}
              className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-background rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";

/**
 * usePDFUpload — uploads a PDF to the backend for question generation.
 */
export function usePDFUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file) => {
    setUploading(true);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);

    try {
      const { data } = await api.post("/upload/pdf", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      return data;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, progress, uploading };
}

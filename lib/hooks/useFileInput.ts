import { ChangeEvent, useRef, useState } from "react";

export const useFileInput = (maxSize: number) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log("📂 File input triggered");

    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      console.log("✅ Selected file:", selectedFile);

      if (selectedFile.size > maxSize) {
        console.warn("⚠️ File too large. Size:", selectedFile.size);
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setFile(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      console.log("🔗 Preview URL created:", objectUrl);

      // Extract duration for video files
      if (selectedFile.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          if (isFinite(video.duration) && video.duration > 0) {
            const roundedDuration = Math.round(video.duration);
            setDuration(roundedDuration);
            console.log("🎞️ Video duration:", roundedDuration, "seconds");
          } else {
            setDuration(null);
            console.warn("⚠️ Invalid video duration");
          }

          URL.revokeObjectURL(video.src);
        };

        video.src = objectUrl;
      }
    } else {
      console.log("❌ No file selected");
    }
  };

  const resetFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      console.log("🗑️ Preview URL revoked");
    }

    setFile(null);
    setPreviewUrl(null);
    setDuration(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    console.log("🔁 File input reset");
  };

  return { file, previewUrl, duration, inputRef, handleFileChange, resetFile };
};

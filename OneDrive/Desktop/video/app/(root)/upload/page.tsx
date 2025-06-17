"use client";

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import {
  getVideoUploadUrl,
  getThumbnailUploadUrl,
  saveVideoDetails,
} from "@/lib/actions/video";
import { useRouter } from "next/navigation";
import { FileInput, FormField } from "@/components";
import { useFileInput } from "@/lib/hooks/useFileInput";
import { MAX_THUMBNAIL_SIZE, MAX_VIDEO_SIZE } from "@/constants";

const uploadFileToBunny = (
  file: File,
  uploadUrl: string,
  accessKey: string
): Promise<void> =>
  fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      AccessKey: accessKey,
    },
    body: file,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  });

const UploadPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [formData, setFormData] = useState<VideoFormValues>({
    title: "",
    description: "",
    tags: "",
    visibility: "public",
  });

  const video = useFileInput(MAX_VIDEO_SIZE);
  const thumbnail = useFileInput(MAX_THUMBNAIL_SIZE);

  useEffect(() => {
    if (video.duration !== null) {
      setVideoDuration(video.duration);
    }
  }, [video.duration]);

  useEffect(() => {
    const checkForRecordedVideo = async () => {
      try {
        const stored = sessionStorage.getItem("recordedVideo");
        if (!stored) return;

        const { url, name, type, duration } = JSON.parse(stored);
        const blob = await fetch(url).then((res) => res.blob());
        const file = new File([blob], name, { type, lastModified: Date.now() });

        if (video.inputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          video.inputRef.current.files = dataTransfer.files;

          const event = new Event("change", { bubbles: true });
          video.inputRef.current.dispatchEvent(event);

          video.handleFileChange({
            target: { files: dataTransfer.files },
          } as ChangeEvent<HTMLInputElement>);
        }

        if (duration) setVideoDuration(duration);

        sessionStorage.removeItem("recordedVideo");
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error loading recorded video:", err);
      }
    };

    checkForRecordedVideo();
  }, [video]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Upload Video button clicked");
    setIsSubmitting(true);

    try {
      if (!video.file || !thumbnail.file) {
        setError("Please upload video and thumbnail files.");
        return;
      }

      if (!formData.title || !formData.description) {
        setError("Please fill in all required fields.");
        return;
      }

      // Debug log input data
      console.log("Form data:", formData);
      console.log("Video file:", video.file);
      console.log("Thumbnail file:", thumbnail.file);

      const {
        videoId,
        uploadUrl: videoUploadUrl,
        accessKey: videoAccessKey,
      } = await getVideoUploadUrl();

      console.log("Received from getVideoUploadUrl:");
      console.log("videoId:", videoId);
      console.log("videoUploadUrl:", videoUploadUrl);
      console.log("videoAccessKey:", videoAccessKey);

      if (!videoUploadUrl || !videoAccessKey)
        throw new Error("Failed to get video upload credentials");

      await uploadFileToBunny(video.file, videoUploadUrl, videoAccessKey);
      console.log("✅ Video uploaded successfully");

      const {
        uploadUrl: thumbnailUploadUrl,
        cdnUrl: thumbnailCdnUrl,
        accessKey: thumbnailAccessKey,
      } = await getThumbnailUploadUrl(videoId);

      console.log("Received from getThumbnailUploadUrl:");
      console.log("thumbnailUploadUrl:", thumbnailUploadUrl);
      console.log("thumbnailCdnUrl:", thumbnailCdnUrl);
      console.log("thumbnailAccessKey:", thumbnailAccessKey);

      if (!thumbnailUploadUrl || !thumbnailCdnUrl || !thumbnailAccessKey)
        throw new Error("Failed to get thumbnail upload credentials");

      await uploadFileToBunny(
        thumbnail.file,
        thumbnailUploadUrl,
        thumbnailAccessKey
      );
      console.log("✅ Thumbnail uploaded successfully");

      await saveVideoDetails({
        videoId,
        thumbnailUrl: thumbnailCdnUrl,
        ...formData,
        duration: videoDuration,
      });

      console.log("✅ Video details saved");
      router.push(`/video/${videoId}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="wrapper-md upload-page">
      <h1>Upload a video</h1>
      {error && <div className="error-field">{error}</div>}
      <form
        className="rounded-20 gap-6 w-full flex flex-col shadow-10 px-5 py-7.5"
        onSubmit={onSubmit}
      >
        <FormField
          id="title"
          label="Title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter a clear and concise video title"
        />

        <FormField
          id="description"
          label="Description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Briefly describe what this video is about"
          as="textarea"
        />

        <FileInput
          id="video"
          label="Video"
          accept="video/*"
          file={video.file}
          previewUrl={video.previewUrl}
          inputRef={video.inputRef}
          onChange={video.handleFileChange}
          onReset={video.resetFile}
          type="video"
        />

        <FileInput
          id="thumbnail"
          label="Thumbnail"
          accept="image/*"
          file={thumbnail.file}
          previewUrl={thumbnail.previewUrl}
          inputRef={thumbnail.inputRef}
          onChange={thumbnail.handleFileChange}
          onReset={thumbnail.resetFile}
          type="image"
        />

        <FormField
          id="visibility"
          label="Visibility"
          value={formData.visibility}
          onChange={handleInputChange}
          as="select"
          options={[
            { value: "public", label: "Public" },
            { value: "private", label: "Private" },
          ]}
        />

        <button type="submit" disabled={isSubmitting} className="submit-button">
          {isSubmitting ? "Uploading..." : "Upload Video"}
        </button>
      </form>
    </main>
  );
};

export default UploadPage;

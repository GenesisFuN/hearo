"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "./Toast";
import { logError } from "@/lib/errorHandling";

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "draft" | "processing" | "published" | "failed";
}

export default function UploadManager() {
  const { user } = useAuth();
  const { showSuccess, showError, showToast } = useToast();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<"text" | "audio">("text");
  const [aiSettings, setAiSettings] = useState({
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - Natural female voice
    voiceStyle: "professional-male",
    readingSpeed: "normal",
    addMusic: false,
    chapterBreaks: true,
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
  });

  // Force correct initial voice on component mount
  useEffect(() => {
    // Clear any potential localStorage voice preferences
    if (typeof window !== "undefined") {
      localStorage.removeItem("hearo-voice-preference");
      sessionStorage.removeItem("hearo-voice-preference");
    }

    // Force Rachel as the default
    if (aiSettings.voiceId !== "21m00Tcm4TlvDq8ikWAM") {
      console.log(
        "COMPONENT MOUNT - Correcting voice from",
        aiSettings.voiceId,
        "to Rachel"
      );
      setAiSettings((prev) => ({
        ...prev,
        voiceId: "21m00Tcm4TlvDq8ikWAM", // Force Rachel
      }));
    }
  }, []); // Run once on mount

  /* OLD ELEVENLABS VOICES - COMMENTED OUT
  const voiceOptions = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm, professional female narrator" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Strong, confident female voice" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Expressive female storyteller" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Deep, warm male narrator" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", description: "Mature, authoritative male voice" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Natural, conversational male voice" },
    { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", description: "Young, energetic male voice" },
    { id: "CYw3kZ02Hs0563khs1Fj", name: "Emily", description: "Warm, friendly female voice" },
  ];
  */

  // Coqui TTS (XTTS v2) - Default speakers
  const voiceOptions = [
    {
      id: "", // Empty = use default speaker
      name: "Claribel Dervla",
      description: "Natural, warm female narrator (Default)",
    },
    {
      id: "",
      name: "Daisy Studious",
      description: "Clear, professional female voice",
    },
    {
      id: "",
      name: "Gracie Wise",
      description: "Mature, authoritative female",
    },
    {
      id: "",
      name: "Tammie Ema",
      description: "Energetic, expressive female",
    },
    {
      id: "",
      name: "Alison Dietlinde",
      description: "Soft, gentle female voice",
    },
    {
      id: "",
      name: "Ana Florence",
      description: "Young, friendly female",
    },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const testVoice = async () => {
    try {
      const selectedVoice = voiceOptions.find(
        (v) => v.id === aiSettings.voiceId
      );
      const testText = `Hello! This is ${selectedVoice?.name}. I'm your AI narrator and I'll be reading your book with this voice.`;

      const response = await fetch("/api/test-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          voiceSettings: {
            voiceId: aiSettings.voiceId,
            stability: aiSettings.stability,
            similarityBoost: aiSettings.similarityBoost,
            style: aiSettings.style,
            useSpeakerBoost: aiSettings.useSpeakerBoost,
          },
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error("Voice test failed:", error);
    }
  };

  const handleFiles = (files: FileList) => {
    // Directly process files without modal
    Array.from(files).forEach((file) => {
      const uploadFile: UploadFile = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "draft",
      };

      setUploads((prev) => [...prev, uploadFile]);

      // Real upload with API call
      uploadFileToAPI(file, uploadFile.id);
    });
  };

  // Real API upload function
  const uploadFileToAPI = async (file: File, fileId: string) => {
    // SAFETY CHECK: Ensure we're not sending the wrong voice
    let settingsToUse = aiSettings;
    if (aiSettings.voiceId === "EXAVITQu4vr4xnSDxMaL") {
      settingsToUse = {
        ...aiSettings,
        voiceId: "21m00Tcm4TlvDq8ikWAM", // Force Rachel if Bella is detected
      };
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("aiSettings", JSON.stringify(settingsToUse));
    formData.append("agreedToTerms", "true"); // User must check box to upload

    try {
      // Simulate progress for now (in production, use axios for progress tracking)
      const progressInterval = setInterval(() => {
        setUploads((prev) =>
          prev.map((f) => {
            if (f.id === fileId && f.progress < 95) {
              return { ...f, progress: f.progress + Math.random() * 10 };
            }
            return f;
          })
        );
      }, 200);

      // Use AbortController with a very long timeout (5 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      let response;
      let result;
      let uploadSucceeded = false;

      try {
        // Get the session token for authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated - please sign in again");
        }

        showToast("Uploading your book...", "info");

        response = await fetch(`/api/upload/${uploadType}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Upload failed" }));
          console.error("Upload failed:", response.status, errorData);

          // Handle duplicate content specifically
          if (response.status === 409 && errorData.isDuplicate) {
            showError(
              new Error(
                `Duplicate content detected! This text has already been uploaded as "${errorData.existingFile}". Please upload different content.`
              )
            );
            // Remove the upload from the list since it's a duplicate
            setUploads((prev) => prev.filter((f) => f.id !== fileId));
            return;
          }

          const error = new Error(
            errorData.userMessage || errorData.error || "Upload failed"
          );
          logError(error, "Upload Manager");
          showError(error);

          throw new Error(
            `Upload failed: ${response.status} - ${errorData.error || errorData.message || "Unknown error"}`
          );
        }

        result = await response.json();
        uploadSucceeded = true;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        // If it's a timeout/abort error and it's a text upload, treat as background processing
        if (fetchError.name === "AbortError" && uploadType === "text") {
          console.log(
            "Upload request timed out, but file was submitted. Starting polling..."
          );

          // Mark as processing and start polling with timestamp-based ID
          setUploads((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, progress: 10, status: "processing" } : f
            )
          );

          // Generate estimated book ID from file upload time
          const estimatedBookId = `book_${fileId.split("-")[0] || Date.now()}`;
          pollProcessingStatus(estimatedBookId, fileId);
          return; // Don't throw error, just start polling
        }

        throw fetchError; // Re-throw other errors
      }

      // If we got here, upload succeeded
      if (uploadSucceeded && result && result.success) {
        showSuccess("Book uploaded successfully! Processing audio...");

        setUploads((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  progress: 100,
                  status: uploadType === "text" ? "processing" : "published",
                }
              : f
          )
        );

        // Trigger TTS processing and poll for completion if text upload
        if (uploadType === "text" && result.chapters && result.voiceSettings) {
          // Start TTS processing
          startTTSProcessing(
            result.workId,
            result.chapters,
            result.voiceSettings
          );
          // Poll for status
          pollProcessingStatus(result.bookId, fileId);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      logError(error, "Upload Manager - File Upload");
      showError(error);

      // For text uploads, mark as processing anyway since background job may still work
      if (uploadType === "text") {
        console.log(
          "Upload request failed, but background processing may continue. Marking as processing..."
        );
        setUploads((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, status: "processing", progress: 95 } : f
          )
        );

        // Try to poll for status anyway with a generated bookId
        const estimatedBookId = `book_${Date.now()}`;
        pollProcessingStatus(estimatedBookId, fileId);
      } else {
        // For audio uploads, actually mark as failed
        setUploads((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "failed" } : f))
        );
      }
    }
  };

  // Start TTS processing by calling the API
  const startTTSProcessing = async (
    workId: string,
    chapters: any[],
    voiceSettings: any
  ) => {
    try {
      console.log(`🎙️ Starting TTS processing for work ${workId}...`);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/tts/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          workId,
          userId: session?.user?.id,
          chapters,
          voiceSettings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("TTS processing failed:", error);
        showToast("TTS processing failed to start", "error");
      } else {
        console.log("✅ TTS processing started successfully");
      }
    } catch (error) {
      console.error("Error starting TTS processing:", error);
      logError(error, "Upload Manager - Start TTS");
    }
  };

  // Poll for AI processing status
  const pollProcessingStatus = async (bookId: string, fileId: string) => {
    let pollCount = 0;
    const maxPolls = 300; // 25 minutes max (5 seconds * 300 = 1500 seconds)

    const interval = setInterval(async () => {
      pollCount++;

      try {
        const response = await fetch(`/api/books/${bookId}/status`);

        if (!response.ok) {
          console.error("Status check failed:", response.status);
          // Don't mark as error yet, keep trying
          return;
        }

        const data = await response.json();
        const { status, progress, message } = data;

        console.log(`Processing status: ${status}, progress: ${progress}%`);

        // Update progress bar and status
        setUploads((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  progress: progress !== undefined ? progress : f.progress,
                  status: status === "published" ? "published" : "processing",
                }
              : f
          )
        );

        if (status === "published") {
          clearInterval(interval);
          console.log("Processing complete!");
        }

        // Stop polling after max time to prevent infinite loops
        if (pollCount >= maxPolls) {
          console.warn("Max polling time reached");
          clearInterval(interval);
          setUploads((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, status: "failed" } : f))
          );
        }
      } catch (error) {
        console.error("Error checking processing status:", error);
        // Don't mark as failed immediately, might be temporary network issue
      }
    }, 5000); // Check every 5 seconds
  };

  const simulateUpload = (fileId: string) => {
    const interval = setInterval(() => {
      setUploads((prev) =>
        prev.map((file) => {
          if (file.id === fileId) {
            const newProgress = Math.min(
              file.progress + Math.random() * 20,
              100
            );

            if (newProgress === 100) {
              clearInterval(interval);

              // Start AI processing for text files
              if (uploadType === "text") {
                setTimeout(() => {
                  setUploads((prev) =>
                    prev.map((f) =>
                      f.id === fileId ? { ...f, status: "processing" } : f
                    )
                  );

                  // Simulate AI processing completion
                  setTimeout(() => {
                    setUploads((prev) =>
                      prev.map((f) =>
                        f.id === fileId ? { ...f, status: "published" } : f
                      )
                    );
                  }, 5000);
                }, 1000);
              } else {
                return { ...file, progress: newProgress, status: "published" };
              }
            }

            return { ...file, progress: newProgress };
          }
          return file;
        })
      );
    }, 500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-surface/50 rounded-lg p-6">
      <h2 className="text-xl font-bold text-text-light mb-6">
        Content Upload Center
      </h2>

      {/* Upload Type Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setUploadType("text")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            uploadType === "text"
              ? "bg-accent text-background"
              : "bg-surface text-text-light hover:bg-surface/80"
          }`}
        >
          📄 Text Upload
        </button>
        <button
          onClick={() => setUploadType("audio")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            uploadType === "audio"
              ? "bg-accent text-background"
              : "bg-surface text-text-light hover:bg-surface/80"
          }`}
        >
          🎵 Audio Upload
        </button>
      </div>

      {/* Coqui TTS Settings for Text Upload */}
      {uploadType === "text" && (
        <div className="bg-background/30 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-text-light mb-4 flex items-center gap-2">
            🎙️ Coqui TTS Settings
            <span className="text-xs text-text-light/60 font-normal">
              (Self-Hosted AI)
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Default Speaker
              </label>
              <select
                value={aiSettings.voiceId}
                onChange={(e) =>
                  setAiSettings((prev) => ({
                    ...prev,
                    voiceId: e.target.value,
                  }))
                }
                className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-text-light"
              >
                {voiceOptions.map((voice, index) => (
                  <option key={index} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-light/50 mt-1">
                ℹ️ For voice cloning, upload a reference file below
              </p>
            </div>

            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Playback Speed
              </label>
              <select
                value={aiSettings.readingSpeed}
                onChange={(e) =>
                  setAiSettings((prev) => ({
                    ...prev,
                    readingSpeed: e.target.value,
                  }))
                }
                className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-text-light"
              >
                <option value="0.8">Slower (0.8x)</option>
                <option value="0.92">Optimal (0.92x) - Recommended</option>
                <option value="1.0">Normal (1.0x)</option>
                <option value="1.1">Faster (1.1x)</option>
              </select>
              <p className="text-xs text-text-light/50 mt-1">
                💡 0.92x gives the most natural audiobook pacing
              </p>
            </div>
          </div>

          {/* Voice Cloning Upload (Future Feature) */}
          <div className="border border-surface/50 rounded-lg p-3 mb-4 opacity-50">
            <label className="block text-sm text-text-light/70 mb-2">
              🎤 Voice Cloning (Coming Soon)
            </label>
            <input
              type="file"
              accept="audio/wav,audio/mp3"
              disabled
              className="w-full bg-surface border border-surface rounded-lg px-3 py-2 text-text-light/50 cursor-not-allowed"
            />
            <p className="text-xs text-text-light/50 mt-1">
              Upload a 6-30 second audio sample of a voice to clone
            </p>
          </div>

          <div className="text-xs text-text-light/60 bg-surface/30 rounded p-3">
            ℹ️ <strong>Note:</strong> Coqui XTTS v2 provides natural,
            high-quality TTS generation. Narration is processed in the
            background - you'll be notified when complete.
          </div>
        </div>
      )}

      {/* REMOVED: ElevenLabs Advanced Settings (Stability, Clarity, Style)
          Coqui XTTS v2 uses different parameters. If needed in future:
          - Temperature (0.1-1.0): Controls randomness
          - Speed (0.5-2.0): Playback speed multiplier
          - Enable text splitting: For long texts
          - Language: Auto-detect or specify
      */}

      {/* Old ElevenLabs Advanced Settings - Commented Out */}
      {false && uploadType === "text" && (
        <div className="bg-background/30 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-text-light/70 mb-3">
            Advanced Voice Settings (ElevenLabs)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Stability ({aiSettings.stability})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings.stability}
                onChange={(e) =>
                  setAiSettings((prev) => ({
                    ...prev,
                    stability: parseFloat(e.target.value),
                  }))
                }
                style={{
                  background: `linear-gradient(to right, var(--color-highlight) 0%, var(--color-highlight) ${aiSettings.stability * 100}%, var(--color-surface) ${aiSettings.stability * 100}%, var(--color-surface) 100%)`,
                }}
                className="w-full slider-highlight"
              />
            </div>

            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Clarity ({aiSettings.similarityBoost})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings.similarityBoost}
                onChange={(e) =>
                  setAiSettings((prev) => ({
                    ...prev,
                    similarityBoost: parseFloat(e.target.value),
                  }))
                }
                style={{
                  background: `linear-gradient(to right, var(--color-highlight) 0%, var(--color-highlight) ${aiSettings.similarityBoost * 100}%, var(--color-surface) ${aiSettings.similarityBoost * 100}%, var(--color-surface) 100%)`,
                }}
                className="w-full slider-highlight"
              />
            </div>

            <div>
              <label className="block text-sm text-text-light/70 mb-2">
                Style ({aiSettings.style})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings.style}
                onChange={(e) =>
                  setAiSettings((prev) => ({
                    ...prev,
                    style: parseFloat(e.target.value),
                  }))
                }
                style={{
                  background: `linear-gradient(to right, var(--color-highlight) 0%, var(--color-highlight) ${aiSettings.style * 100}%, var(--color-surface) ${aiSettings.style * 100}%, var(--color-surface) 100%)`,
                }}
                className="w-full slider-highlight"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive
            ? "border-accent bg-accent/10"
            : "border-accent/30 hover:border-accent/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-accent text-2xl">
            {uploadType === "text" ? "📄" : "🎵"}
          </div>
        </div>

        <h3 className="text-lg font-medium text-text-light mb-2">
          {uploadType === "text"
            ? "Drop your manuscript here"
            : "Drop your audio files here"}
        </h3>

        <p className="text-text-light/60 mb-4">
          {uploadType === "text"
            ? "Supports: .txt, .docx, .pdf, .epub"
            : "Supports: .mp3, .wav, .m4a, .flac"}
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-accent hover:bg-accent/80 text-background px-6 py-2 rounded-lg font-medium transition"
        >
          Choose Files
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={
            uploadType === "text"
              ? ".txt,.docx,.pdf,.epub"
              : ".mp3,.wav,.m4a,.flac"
          }
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-text-light mb-4">Upload Progress</h3>
          <div className="space-y-3">
            {uploads.map((file) => (
              <div key={file.id} className="bg-background/30 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-text-light">
                      {file.name}
                    </div>
                    <div className="text-sm text-text-light/60">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        file.status === "published"
                          ? "bg-green-500/20 text-green-400"
                          : file.status === "processing"
                            ? "bg-orange-500/20 text-orange-400"
                            : file.status === "draft"
                              ? "bg-accent/20 text-accent"
                              : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {file.status === "draft"
                        ? "Uploading..."
                        : file.status === "processing"
                          ? "AI Processing..."
                          : file.status === "published"
                            ? "Complete"
                            : "Error"}
                    </div>
                  </div>
                </div>

                {file.status !== "published" && (
                  <div className="w-full bg-surface rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all duration-500"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                )}

                {file.status === "processing" && (
                  <div className="mt-2 text-sm text-text-light/70">
                    🤖 AI is generating narration with {aiSettings.voiceStyle}{" "}
                    voice...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

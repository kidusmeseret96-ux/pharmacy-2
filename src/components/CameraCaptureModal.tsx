import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { compressImageFile } from '../lib/api.ts';
import { soundEngine } from '../lib/soundEngine.ts';

interface CameraCaptureModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function CameraCaptureModal({
  open,
  title,
  subtitle,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeSessionRef = useRef(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      activeSessionRef.current += 1;
      stopStream();
      setPreviewUrl(null);
      setCameraError(null);
      return;
    }
    void startCamera();
    return () => {
      activeSessionRef.current += 1;
      stopStream();
    };
  }, [open]);

  // Attach active MediaStream once <video> is mounted and not hidden behind previewUrl
  useEffect(() => {
    if (!open || !cameraActive || previewUrl) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      void video.play().catch(() => {
        setCameraError('Unable to start live camera playback. Please upload an image below.');
      });
    }
  }, [open, cameraActive, previewUrl]);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    const sessionId = ++activeSessionRef.current;
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera preview is unavailable on this browser. Upload an image file below.');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (sessionId !== activeSessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      if (sessionId !== activeSessionRef.current) return;
      setCameraError('Camera access was blocked or no camera was detected. You can upload a photo directly.');
      setCameraActive(false);
    }
  }

  function handleSnap() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('Camera stream is still warming up. Please wait a moment or upload an image.');
      return;
    }
    const canvas = document.createElement('canvas');
    const maxDim = 960;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    soundEngine.playShutter();
    setPreviewUrl(dataUrl);
    stopStream();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      soundEngine.playShutter();
      setCameraError(null);
      setPreviewUrl(compressed);
      stopStream();
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Failed to load image.');
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 overflow-y-auto yoya-scroll-contain"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        className="w-full max-w-lg rounded-[26px] apple-surface yoya-modal-panel outline-none shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#DCE3DC] dark:border-[#1F3037]">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-[#111C18] dark:text-[#EDF4F1] truncate">{title}</h3>
            <p className="text-xs text-[#4B5D55] dark:text-[#92A8A1] mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-lg text-[#4B5D55] dark:text-[#92A8A1] hover:bg-[#EAEFEA] dark:hover:bg-[#17242A] transition-colors shrink-0"
            aria-label="Close capture modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[84vh] overflow-y-auto yoya-scroll-contain">
          <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden border border-[#DCE3DC] dark:border-[#1F3037] bg-[#0A1114] flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Captured verification" className="w-full h-full object-contain" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={cameraActive ? 'w-full h-full object-cover' : 'hidden'}
                />
                {!cameraActive && (
                  <div className="px-6 text-center space-y-3">
                    <Camera className="w-10 h-10 mx-auto text-[#92A8A1]" />
                    <p className="text-sm text-[#92A8A1]">
                      {cameraError || 'Initializing counter camera...'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-[#DCE3DC] dark:border-[#1F3037] text-sm font-medium text-[#111C18] dark:text-[#EDF4F1] hover:bg-[#EAEFEA] dark:hover:bg-[#17242A] transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {previewUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      void startCamera();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-[#DCE3DC] dark:border-[#1F3037] text-sm font-medium text-[#4B5D55] dark:text-[#92A8A1] hover:bg-[#EAEFEA] dark:hover:bg-[#17242A] transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCapture(previewUrl);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:hover:bg-[#19A874] text-white dark:text-[#081310] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Use Photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!cameraActive}
                  onClick={handleSnap}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0D6E52] hover:bg-[#09553F] dark:bg-[#22C58B] dark:hover:bg-[#19A874] disabled:opacity-40 text-white dark:text-[#081310] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

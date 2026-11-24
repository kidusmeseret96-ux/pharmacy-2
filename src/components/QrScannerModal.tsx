import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertCircle, Camera, QrCode, RefreshCw, X } from 'lucide-react';
import { soundEngine } from '../lib/soundEngine.ts';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onValidQr: (type: 'clock_in' | 'clock_out', qrToken: string) => Promise<void>;
}

export function parseYoyaAttendanceQr(rawText: string): {
  type: 'clock_in' | 'clock_out';
  qrToken: string;
} | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/') && !trimmed.includes('attendance=')) {
    return null;
  }
  try {
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? `https://yoya.local${trimmed}` : `https://yoya.local/?${trimmed}`);
    const att = url.searchParams.get('attendance');
    const qr = url.searchParams.get('qr')?.trim() ?? '';
    if ((att === 'clock_in' || att === 'clock_out') && /^[A-Za-z0-9_-]{16,64}$/.test(qr)) {
      return { type: att, qrToken: qr };
    }
    return null;
  } catch {
    return null;
  }
}

export function QrScannerModal({ open, onClose, onValidQr }: QrScannerModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanAtRef = useRef(0);
  const processingRef = useRef(false);
  const activeSessionRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      activeSessionRef.current += 1;
      stopScanner();
      setError(null);
      setSubmitting(false);
      processingRef.current = false;
      return;
    }
    panelRef.current?.focus({ preventScroll: true });
    void startCamera();
    return () => {
      activeSessionRef.current += 1;
      stopScanner();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !cameraActive) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    void video
      .play()
      .then(() => {
        scheduleScanFrame();
      })
      .catch(() => {
        setError('Could not start camera preview. Check camera permissions and tap Retry Camera.');
      });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, cameraActive]);

  function stopScanner() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
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
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported on this browser or device.');
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
      setError('Camera permission was denied or no camera is connected. Allow camera access and tap Retry Camera.');
      setCameraActive(false);
    }
  }

  async function handleDecodedQr(rawData: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    const parsed = parseYoyaAttendanceQr(rawData);
    if (!parsed) {
      soundEngine.playWarning();
      setError('Unrecognized QR code. Please scan an official YOYA Pharmacy Clock-In or Clock-Out QR poster.');
      setTimeout(() => {
        processingRef.current = false;
      }, 1500);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onValidQr(parsed.type, parsed.qrToken);
      stopScanner();
      onClose();
    } catch (err) {
      soundEngine.playWarning();
      setError(err instanceof Error ? err.message : 'Invalid or expired YOYA Pharmacy QR code.');
      setTimeout(() => {
        processingRef.current = false;
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  function scheduleScanFrame() {
    const tick = (now: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !streamRef.current) return;

      if (
        now - lastScanAtRef.current >= 120 &&
        video.readyState >= video.HAVE_ENOUGH_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !processingRef.current
      ) {
        lastScanAtRef.current = now;
        const maxScanDim = 520;
        const scale = Math.min(1, maxScanDim / Math.max(video.videoWidth, video.videoHeight));
        const targetW = Math.max(1, Math.round(video.videoWidth * scale));
        const targetH = Math.max(1, Math.round(video.videoHeight * scale));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          const imageData = ctx.getImageData(0, 0, targetW, targetH);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code?.data) {
            void handleDecodedQr(code.data);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 overflow-y-auto yoya-scroll-contain"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[26px] apple-surface yoya-modal-panel shadow-2xl overflow-hidden outline-none max-h-[90vh] overflow-y-auto yoya-scroll-contain"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode className="w-5 h-5 text-[#0D6E52] dark:text-[#22C58B] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold truncate">Scan Attendance QR</h3>
              <p className="text-xs text-[#5B6470] dark:text-[#98A2AE]">
                Point your camera at the pharmacy Clock-In or Clock-Out QR poster.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full apple-inset hover:opacity-80 shrink-0"
            aria-label="Close QR scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative aspect-square w-full max-h-[340px] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.1] bg-[#0A1114] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cameraActive ? 'w-full h-full object-cover' : 'hidden'}
            />
            <canvas ref={canvasRef} className="hidden" />
            {cameraActive ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-2xl border-2 border-[#22C58B] shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]" />
              </div>
            ) : (
              <div className="px-6 text-center space-y-2.5">
                <Camera className="w-10 h-10 mx-auto text-[#92A8A1]" />
                <p className="text-xs text-[#92A8A1]">
                  {submitting ? 'Verifying QR code...' : 'Starting camera scanner...'}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                processingRef.current = false;
                stopScanner();
                void startCamera();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-2xl apple-inset text-xs font-semibold hover:opacity-85"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Camera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

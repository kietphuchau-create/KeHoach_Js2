'use client';

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export interface QrScanResult {
  raw: string;
  type: 'BOOKING_CODE' | 'CCCD' | 'OTHER';
  bookingCode?: string;
  cccdNumber?: string;
  fullName?: string;
}

interface QrCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (result: QrScanResult) => void;
  title?: string;
}

// Hàm phát tiếng "bíp" thành công bằng Web Audio API không cần file âm thanh
const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Bỏ qua nếu trình duyệt chặn audio autoplay
  }
};

// Phân tích nội dung mã QR quét được (Mã vé hoặc QR CCCD gắn chip Bộ Công An)
export const parseQrContent = (text: string): QrScanResult => {
  const trimmed = text.trim();

  // Định dạng QR thẻ CCCD gắn chip Việt Nam:
  // SốCCCD|SốCMNDcũ|Họ và tên|Ngày sinh|Giới tính|Địa chỉ thường trú|Ngày cấp
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    if (parts.length >= 3 && /^\d{12}$/.test(parts[0])) {
      return {
        raw: trimmed,
        type: 'CCCD',
        cccdNumber: parts[0],
        fullName: parts[2] ? parts[2].trim() : undefined,
      };
    }
  }

  // Nếu là chuỗi 12 chữ số thuần túy -> CCCD
  if (/^\d{12}$/.test(trimmed)) {
    return {
      raw: trimmed,
      type: 'CCCD',
      cccdNumber: trimmed,
    };
  }

  // Nếu là mã vé hẹn MedSched (MED-XXXXXX hoặc WALK-XXXXXX hoặc bất kỳ mã booking)
  return {
    raw: trimmed,
    type: 'BOOKING_CODE',
    bookingCode: trimmed,
  };
};

export const QrCameraScannerModal: React.FC<QrCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Quét Mã QR Vé Khám / Thẻ CCCD',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<QrScanResult | null>(null);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setScannedResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Trình duyệt không hỗ trợ truy cập máy ảnh (Camera API).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Bạn đã từ chối quyền sử dụng camera. Vui lòng cấp quyền trong cài đặt trình duyệt.'
          : 'Không thể mở camera trên thiết bị này.'
      );
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      playBeep();
      const parsed = parseQrContent(code.data);
      setScannedResult(parsed);
      stopCamera();

      // Đợi hiệu ứng phản hồi rồi gọi callback
      setTimeout(() => {
        onScanSuccess(parsed);
        onClose();
      }, 600);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-pine-teal font-bold text-sm">
            <Camera size={18} className="text-emerald-600" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="relative bg-black flex-1 min-h-[340px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="text-center p-6 text-white max-w-xs space-y-3">
              <CameraOff size={42} className="mx-auto text-rose-400 opacity-80" />
              <div className="text-xs font-semibold text-rose-200">{cameraError}</div>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw size={14} /> Thử lại
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target Box & Animated Laser */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64 border-2 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Góc viền target */}
                  <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Laser quét chuyển động */}
                  {!scannedResult && (
                    <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scannerLaser_2s_ease-in-out_infinite]" />
                  )}

                  {/* Khi quét thành công */}
                  {scannedResult && (
                    <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-3 text-center animate-in zoom-in-90 duration-200">
                      <CheckCircle2 size={48} className="text-emerald-300 drop-shadow-md mb-1" />
                      <div className="text-xs font-black uppercase tracking-wider">Đã quét thành công!</div>
                      <div className="text-sm font-mono font-bold mt-1 bg-black/60 px-3 py-1 rounded-lg">
                        {scannedResult.bookingCode || scannedResult.cccdNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hướng dẫn căn chỉnh */}
              <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                <span className="bg-black/70 text-white text-[11px] font-medium px-4 py-1.5 rounded-full backdrop-blur-xs">
                  Hướng camera vào mã QR vé hẹn hoặc mã QR trên thẻ CCCD
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Camera trực tiếp</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={12} /> Đổi camera
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

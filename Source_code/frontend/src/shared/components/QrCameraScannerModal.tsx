'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Upload, 
  Image as ImageIcon, 
  Clipboard, 
  Sparkles, 
  Loader2,
  FileImage
} from 'lucide-react';

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

// Hàm phát tiếng "bíp" thành công bằng Web Audio API không cần file âm thanh ngoài
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

// Phân tích nội dung mã QR quét được (Mã vé MedSched hoặc QR CCCD gắn chip Bộ Công An)
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

  // Nếu là URL chứa tham số code= (ví dụ: http://localhost:3000/checkin?code=MED478011)
  if (trimmed.includes('code=')) {
    const match = trimmed.match(/[?&]code=([^&]+)/);
    if (match && match[1]) {
      return {
        raw: trimmed,
        type: 'BOOKING_CODE',
        bookingCode: decodeURIComponent(match[1]).trim(),
      };
    }
  }

  // Nếu là URL dạng .../checkin/MED123
  if (trimmed.includes('/checkin/')) {
    const parts = trimmed.split('/checkin/');
    if (parts[1]) {
      return {
        raw: trimmed,
        type: 'BOOKING_CODE',
        bookingCode: decodeURIComponent(parts[1].split('?')[0]).trim(),
      };
    }
  }

  // Nếu là mã vé hẹn MedSched (MED-XXXXXX hoặc WALK-XXXXXX hoặc bất kỳ mã booking thuần túy)
  return {
    raw: trimmed,
    type: 'BOOKING_CODE',
    bookingCode: trimmed,
  };
};

/**
 * Thuật toán quét và giải mã mã QR từ ảnh với cơ chế Đa Tỷ Lệ (Multi-scale Sampling)
 * Giúp nhận diện cực nhạy kể cả khi ảnh có độ phân giải siêu cao (ảnh chụp điện thoại) hoặc ảnh nhỏ.
 */
const decodeQrFromImageBlob = async (blob: Blob): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);

        const tryDecode = (w: number, h: number): string | null => {
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const res = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          return res ? res.data : null;
        };

        // Lần 1: Kích thước gốc của ảnh
        let code = tryDecode(img.width, img.height);
        if (code) return resolve(code);

        // Lần 2: Scale về kích thước chuẩn 1000px nếu ảnh quá lớn
        if (img.width > 1200 || img.height > 1200) {
          const scale = 1000 / Math.max(img.width, img.height);
          code = tryDecode(Math.round(img.width * scale), Math.round(img.height * scale));
          if (code) return resolve(code);
        }

        // Lần 3: Scale về 650px
        if (img.width > 700 || img.height > 700) {
          const scale = 650 / Math.max(img.width, img.height);
          code = tryDecode(Math.round(img.width * scale), Math.round(img.height * scale));
          if (code) return resolve(code);
        }

        // Lần 4: Scale về 450px
        if (img.width > 500 || img.height > 500) {
          const scale = 450 / Math.max(img.width, img.height);
          code = tryDecode(Math.round(img.width * scale), Math.round(img.height * scale));
          if (code) return resolve(code);
        }

        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

export const QrCameraScannerModal: React.FC<QrCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Quét Mã QR Vé Khám / Thẻ CCCD',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'image'>('camera');

  // Quản lý Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<QrScanResult | null>(null);

  // Quản lý Tải ảnh / Dán ảnh (Ctrl+V)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDecodingImage, setIsDecodingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Dừng luồng Camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Khởi động Camera
  const startCamera = useCallback(async () => {
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
        scanCameraFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Bạn đã từ chối quyền sử dụng camera. Vui lòng cấp quyền trong cài đặt trình duyệt hoặc dùng tính năng Dán ảnh (Ctrl+V).'
          : 'Không thể mở camera trên thiết bị này. Vui lòng thử tab Dán/Tải ảnh.'
      );
    }
  }, [facingMode, stopCamera]);

  // Vòng lặp quét từng khung hình video từ Camera
  const scanCameraFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanCameraFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(scanCameraFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data) {
      playBeep();
      const parsed = parseQrContent(code.data);
      setScannedResult(parsed);
      stopCamera();

      // Hiệu ứng hoàn tất
      setTimeout(() => {
        onScanSuccess(parsed);
        onClose();
      }, 700);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanCameraFrame);
  };

  // Xử lý tệp hình ảnh (từ File Picker, Drag & Drop hoặc Ctrl+V Clipboard)
  const processImageFile = async (file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      setImageError('Tệp tải lên không phải là hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }

    // Hiển thị Preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageError(null);
    setIsDecodingImage(true);
    setScannedResult(null);

    // Tự động chuyển sang tab Ảnh nếu đang ở tab Camera
    setActiveTab('image');
    stopCamera();

    try {
      const qrData = await decodeQrFromImageBlob(file);
      if (qrData) {
        playBeep();
        const parsed = parseQrContent(qrData);
        setScannedResult(parsed);

        setTimeout(() => {
          onScanSuccess(parsed);
          onClose();
        }, 800);
      } else {
        setImageError('Không tìm thấy mã QR hợp lệ trong hình ảnh này. Bạn vui lòng chụp lại rõ nét hơn hoặc dùng camera.');
      }
    } catch (err: any) {
      console.error('Lỗi giải mã ảnh QR:', err);
      setImageError('Lỗi trong quá trình phân tích hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsDecodingImage(false);
    }
  };

  // Lắng nghe sự kiện PASTE toàn cục (Ctrl + V) khi Modal đang mở
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen]);

  // Điều phối đóng / mở Camera khi đổi Tab hoặc mở Modal
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
      setScannedResult(null);
      setImagePreview(null);
      setImageError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header với Icon và Tiêu đề */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-pine-teal font-bold text-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <div className="text-slate-800 font-extrabold text-sm leading-tight">{title}</div>
              <div className="text-[11px] text-slate-500 font-normal">Hỗ trợ quét Camera trực tiếp hoặc dán ảnh (Ctrl+V)</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh chuyển chế độ (Tabs Switcher) */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-200/60">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                setImageError(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Camera size={15} />
              <span>Camera trực tiếp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('image');
                stopCamera();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Upload size={15} />
              <span>Dán / Tải Ảnh QR</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-mono">Ctrl+V</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NỘI DUNG CHÍNH: TAB CAMERA TRỰC TIẾP                                    */}
        {/* ========================================================================= */}
        {activeTab === 'camera' && (
          <div className="relative bg-black flex-1 min-h-[350px] flex items-center justify-center overflow-hidden">
            {cameraError ? (
              <div className="text-center p-6 text-white max-w-sm space-y-3">
                <CameraOff size={44} className="mx-auto text-rose-400 opacity-80" />
                <div className="text-xs font-semibold text-rose-200">{cameraError}</div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <RefreshCw size={14} /> Thử lại Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('image')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Upload size={14} /> Dán / Tải Ảnh Thay Thế
                  </button>
                </div>
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

                {/* Khung ngắm quét laser */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-64 border-2 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* Góc viền target */}
                    <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                    {/* Laser quét chuyển động */}
                    {!scannedResult && (
                      <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_#34d399] animate-[scannerLaser_2s_ease-in-out_infinite]" />
                    )}

                    {/* Khi quét thành công */}
                    {scannedResult && (
                      <div className="absolute inset-0 bg-emerald-600/50 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-3 text-center animate-in zoom-in-90 duration-200">
                        <CheckCircle2 size={48} className="text-emerald-200 drop-shadow-md mb-1" />
                        <div className="text-xs font-black uppercase tracking-wider">Đã quét thành công!</div>
                        <div className="text-sm font-mono font-bold mt-1 bg-black/70 px-3 py-1 rounded-lg">
                          {scannedResult.bookingCode || scannedResult.cccdNumber}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gợi ý phía dưới camera */}
                <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none">
                  <span className="bg-black/75 text-white text-[11px] font-medium px-4 py-1.5 rounded-full backdrop-blur-xs shadow-md">
                    Hướng camera vào mã QR vé hẹn hoặc mã QR trên thẻ CCCD
                  </span>
                  <span className="bg-emerald-950/80 text-emerald-300 text-[10px] px-3 py-0.5 rounded-full backdrop-blur-xs font-mono">
                    💡 Mẹo: Nhấn Ctrl+V bất kỳ lúc nào để dán ảnh chụp màn hình
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* NỘI DUNG CHÍNH: TAB DÁN / TẢI ẢNH MÃ QR                                  */}
        {/* ========================================================================= */}
        {activeTab === 'image' && (
          <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[350px] bg-slate-50/60">
            {/* Input file ẩn */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processImageFile(file);
              }}
            />

            {imagePreview ? (
              /* Hiển thị xem trước ảnh vừa dán/chọn */
              <div className="w-full flex flex-col items-center">
                <div className="relative w-full max-w-sm h-64 bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 flex items-center justify-center shadow-inner">
                  <img
                    src={imagePreview}
                    alt="Mã QR tải lên"
                    className="max-w-full max-h-full object-contain"
                  />

                  {/* Vòng xoay phân tích ảnh */}
                  {isDecodingImage && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 animate-in fade-in">
                      <Loader2 size={32} className="animate-spin text-emerald-400" />
                      <div className="text-xs font-bold text-emerald-200">Đang nhận diện mã QR từ ảnh...</div>
                    </div>
                  )}

                  {/* Kết quả giải mã thành công */}
                  {scannedResult && (
                    <div className="absolute inset-0 bg-emerald-600/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-3 text-center animate-in zoom-in-95">
                      <CheckCircle2 size={44} className="text-emerald-200 drop-shadow-md mb-1" />
                      <div className="text-xs font-black uppercase tracking-wider">Đã đọc thành công!</div>
                      <div className="text-sm font-mono font-bold mt-1 bg-black/70 px-3 py-1 rounded-lg">
                        {scannedResult.bookingCode || scannedResult.cccdNumber}
                      </div>
                    </div>
                  )}
                </div>

                {/* Thông báo lỗi nếu ảnh không có QR */}
                {imageError && (
                  <div className="w-full max-w-sm mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Chưa đọc được mã QR:</div>
                      <div>{imageError}</div>
                    </div>
                  </div>
                )}

                {/* Nút thao tác lại */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Upload size={14} /> Chọn ảnh khác
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageError(null);
                    }}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                </div>
              </div>
            ) : (
              /* Khu vực Kéo thả & Dán ảnh (Empty Drop Zone) */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processImageFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-sm h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[1.02]'
                    : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 shadow-xs'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-inner">
                  <Clipboard size={26} />
                </div>

                <div className="text-slate-800 font-extrabold text-sm mb-1">
                  Nhấn <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">Ctrl + V</span> để Dán Ảnh
                </div>
                <div className="text-xs text-slate-500 max-w-xs leading-relaxed mb-3">
                  Chụp màn hình vé hẹn / CCCD rồi bấm dán vào đây, hoặc kéo thả tệp ảnh vào khung này.
                </div>

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition">
                  <FileImage size={14} className="text-emerald-600" />
                  <span>Chọn ảnh từ máy tính</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer controls */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            {activeTab === 'camera' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-600">Camera đang hoạt động</span>
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-emerald-600" />
                <span className="font-medium text-slate-600">Hỗ trợ ảnh PNG, JPG, WebP</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'camera' && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1"
                title="Đổi giữa camera trước và sau"
              >
                <RefreshCw size={12} /> Đổi camera
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

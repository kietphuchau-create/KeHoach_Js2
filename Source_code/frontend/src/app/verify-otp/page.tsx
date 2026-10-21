'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  ShieldCheck,
  Clock,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lấy thông tin phiên từ URL params hoặc sessionStorage
  const [sessionToken, setSessionToken] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [emailMasked, setEmailMasked] = useState('');

  // Trạng thái 4 ô số
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Đồng hồ đếm ngược hiệu lực (120 giây) & Cooldown gửi lại (60 giây)
  const [expiresSeconds, setExpiresSeconds] = useState(120);
  const [resendCooldown, setResendCooldown] = useState(60);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Khởi tạo dữ liệu phiên khi load trang
  useEffect(() => {
    let token = searchParams.get('token');
    let phone = searchParams.get('phone');
    let email = searchParams.get('email');

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('medsched_otp_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          token = token || parsed.sessionToken;
          phone = phone || parsed.phoneMasked;
          email = email || parsed.emailMasked;
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (token) setSessionToken(token);
    if (phone) setPhoneMasked(phone);
    if (email) setEmailMasked(email);

    // Auto-focus vào ô đầu tiên
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 150);
  }, [searchParams]);

  // Bộ đếm thời gian hiệu lực (120s) và gửi lại (60s)
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format số giây thành mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Xử lý khi gõ từng ô số
  const handleDigitChange = (index: number, value: string) => {
    const cleanChar = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);
    setError('');

    // Nếu vừa nhập ký tự hợp lệ -> chuyển focus sang ô tiếp theo
    if (cleanChar && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Nếu đã nhập đủ 4 ký tự -> tự động gọi xác thực
    if (cleanChar && index === 3 && newDigits.every((d) => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  };

  // Xử lý phím Backspace & mũi tên điều hướng
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs[index - 1].current?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // Hỗ trợ Paste mã 4 số từ clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const cleanDigits = pastedData.replace(/\D/g, '').slice(0, 4);

    if (cleanDigits.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < cleanDigits.length; i++) {
        newDigits[i] = cleanDigits[i];
      }
      setDigits(newDigits);

      if (cleanDigits.length === 4) {
        inputRefs[3].current?.focus();
        handleVerify(cleanDigits);
      } else {
        inputRefs[cleanDigits.length].current?.focus();
      }
    }
  };

  // Gửi xác thực mã OTP
  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length < 4) {
      setError('Vui lòng nhập đủ 4 chữ số mã OTP.');
      return;
    }
    if (!sessionToken) {
      setError('Phiên xác thực không hợp lệ. Vui lòng quay lại trang Đăng ký.');
      return;
    }
    if (expiresSeconds <= 0) {
      setError('Mã xác thực đã hết hạn (quá 2 phút). Vui lòng nhấn "Gửi lại mã qua Email".');
      return;
    }

    setLoading(true);
    setError('');
    setResendSuccess('');

    try {
      await api.verifyOtp({
        sessionToken,
        otpCode: code,
      });

      setSuccess(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('medsched_otp_session');
      }

      // Chuyển hướng sau 1.2s
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err: any) {
      const msg = err.message || 'Mã xác thực chưa chính xác. Vui lòng thử lại.';
      setError(msg);

      // Trích xuất số lần thử nếu có
      const match = msg.match(/còn lại (\d+) lần thử/i);
      if (match && match[1]) {
        setAttemptsLeft(parseInt(match[1], 10));
      }

      // Xóa các ô và focus lại ô đầu tiên
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP qua Email
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    if (!sessionToken) {
      setError('Phiên xác thực không hợp lệ. Vui lòng đăng ký lại.');
      return;
    }

    setResending(true);
    setError('');
    setResendSuccess('');

    try {
      const res = await api.resendOtp({ sessionToken });
      setExpiresSeconds(res.expiresInSeconds || 120);
      setResendCooldown(res.resendCooldownSeconds || 60);
      setResendSuccess('Mã OTP mới đã được gửi tới hộp thư Gmail của bạn!');
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } catch (err: any) {
      setError(err.message || 'Gửi lại mã không thành công. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 relative">
      {/* ── CARD CHÍNH: XÁC THỰC MÃ 4 CHỮ SỐ QUA EMAIL ── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md border border-mint-light text-center relative overflow-hidden">
        {/* Họa tiết trang trí viền trên */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-pine-teal to-blue-600" />

        {success ? (
          /* TRẠNG THÁI THÀNH CÔNG */
          <div className="py-6 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">Xác Thực Thành Công!</h2>
              <p className="text-xs text-slate-500">
                Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng vào hệ thống...
              </p>
            </div>
            <div className="w-8 h-8 border-2 border-pine-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          /* FORM NHẬP OTP */
          <div className="space-y-5">
            {/* Logo & Tiêu đề */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-pine-teal border border-mint-light mx-auto shadow-2xs">
                <Mail size={26} />
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Xác Thực Qua Email
              </h1>

              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Mã OTP 4 chữ số đã được gửi tới hộp thư Gmail của bạn:
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-pine-teal text-xs font-mono font-bold border border-teal-200">
                <Inbox size={13} className="text-pine-teal" />
                <span>{emailMasked || phoneMasked || 'Địa chỉ email đăng ký'}</span>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                (Vui lòng kiểm tra mục <strong>Hộp thư đến</strong> hoặc <strong>Thư rác/Spam</strong>)
              </p>
            </div>

            {/* Thông báo gửi lại thành công */}
            {resendSuccess && (
              <AlertMessage
                type="success"
                message={resendSuccess}
                className="py-2 text-xs text-left"
                onClose={() => setResendSuccess('')}
              />
            )}

            {/* Thông báo lỗi */}
            {error && (
              <AlertMessage
                type="error"
                message={error}
                className="py-2 text-xs text-left"
                onClose={() => setError('')}
              />
            )}

            {/* 4 Ô NHẬP SỐ CHUYÊN DỤNG (AUTO-FOCUS & PASTE SUPPORT) */}
            <div className="space-y-2">
              <div
                className="flex items-center justify-center gap-2.5 sm:gap-3"
                onPaste={handlePaste}
              >
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading || expiresSeconds <= 0}
                    className={`w-13 h-15 sm:w-15 sm:h-17 text-2xl sm:text-3xl font-mono font-black text-center rounded-2xl outline-none transition-all duration-200 ${
                      digit
                        ? 'bg-white border-2 border-pine-teal text-pine-teal shadow-sm scale-102 ring-2 ring-pine-teal/20'
                        : 'bg-mint-soft border border-mint-light text-slate-700 focus:bg-white focus:border-pine-teal focus:ring-2 focus:ring-pine-teal/20'
                    } ${expiresSeconds <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="•"
                  />
                ))}
              </div>

              {/* Đồng hồ đếm ngược hiệu lực */}
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <Clock size={13} className={expiresSeconds <= 30 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
                {expiresSeconds > 0 ? (
                  <span className={`font-mono font-bold ${expiresSeconds <= 30 ? 'text-rose-500' : 'text-slate-600'}`}>
                    Mã có hiệu lực trong: {formatTime(expiresSeconds)}
                  </span>
                ) : (
                  <span className="text-rose-500 font-bold">
                    Mã đã hết hạn. Vui lòng gửi lại mã mới.
                  </span>
                )}
              </div>
            </div>

            {/* Nút xác nhận */}
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={loading || digits.join('').length < 4 || expiresSeconds <= 0}
              className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-2.5 sm:py-3 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận &amp; Kích Hoạt</span>
                </>
              )}
            </button>

            {/* Cơ chế gửi lại mã qua Email */}
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2 text-xs">
              <div className="text-slate-500">
                Chưa nhận được email?{' '}
                {resendCooldown > 0 ? (
                  <span className="text-slate-400 font-medium">
                    Gửi lại qua Email sau ({resendCooldown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-pine-teal hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw size={12} className={resending ? 'animate-spin' : ''} />
                    <span>Gửi lại mã qua Email</span>
                  </button>
                )}
              </div>

              {/* Nút quay lại trang Đăng ký */}
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs transition pt-1"
              >
                <ArrowLeft size={12} />
                <span>Quay lại trang Đăng ký</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-pine-teal border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}

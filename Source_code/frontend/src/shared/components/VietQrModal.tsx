'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Copy,
  QrCode,
  CreditCard,
  ShieldCheck,
  Building2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { QrCodeImage } from './QrCodeImage';
import { api } from '@/shared/lib/api';

export interface BankConfig {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  depositAmount: number;
}

// Cấu hình tài khoản ngân hàng chính thức của Trưởng nhóm (KienlongBank)
export const OFFICIAL_BANK_CONFIG: BankConfig = {
  bankId: 'KLB', // Mã VietQR chuẩn Napas 247 của KienlongBank (BIN: 970452)
  bankName: 'KienlongBank - Ngân Hàng TMCP Kiên Long',
  accountNo: '18112007',
  accountName: 'CHAU TUAN KIET',
  depositAmount: 2000,
};

interface VietQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess?: () => void;
  title?: string;
  amount: number;
  description?: string;
  bookingCode?: string;
  appointmentId?: string;
  patientName?: string;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess,
  title = 'Thanh Toán Qua VietQR & Ví MoMo (Napas 247)',
  amount,
  description,
  bookingCode = 'MED-2026',
  appointmentId,
  patientName,
}) => {
  // 1. Tài khoản ngân hàng nhận tiền chính thức
  const bankConfig = OFFICIAL_BANK_CONFIG;

  // 2. Chế độ thanh toán: 'DEPOSIT' (Đặt cọc giữ chỗ) hoặc 'FULL' (Toàn phần)
  const [paymentType, setPaymentType] = useState<'DEPOSIT' | 'FULL'>('DEPOSIT');

  // 3. Trạng thái thanh toán và kiểm tra biến động số dư
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);
  const [paidDetails, setPaidDetails] = useState<{ amount: number; txnRef?: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState<boolean>(false);

  const cleanBookingCode = (bookingCode || 'MED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const transferContent = `MEDPAY ${cleanBookingCode}`;

  // Tính số tiền thực tế theo mode đã chọn
  const fullAmount = Math.max(0, Math.round(amount || 200000));
  const depositAmount = OFFICIAL_BANK_CONFIG.depositAmount;
  const activeAmount = paymentType === 'DEPOSIT' ? depositAmount : fullAmount;

  // URL VietQR chuẩn Napas 247 tương thích tất cả App Ngân Hàng + Ví MoMo
  const vietQrUrl = `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNo}-compact2.png?amount=${activeAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(bankConfig.accountName)}`;

  // Tạo Payment Entity trên backend khi mở modal hoặc đổi chế độ thanh toán
  useEffect(() => {
    if (!isOpen) return;

    setIsPaidSuccess(false);
    setPaidDetails(null);
    setCheckError(null);

    // Gửi yêu cầu khởi tạo thanh toán pending tới backend
    api.createRealPayment({
      appointmentId,
      bookingCode: cleanBookingCode,
      paymentType,
      amount: activeAmount,
      method: 'MOMO',
    }).catch((err) => {
      console.warn('Không thể khởi tạo bản ghi thanh toán backend:', err);
    });
  }, [isOpen, paymentType, activeAmount, appointmentId, cleanBookingCode]);

  // Polling tự động kiểm tra trạng thái thanh toán mỗi 2.8 giây
  useEffect(() => {
    if (!isOpen || isPaidSuccess) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await api.checkRealPaymentStatus({
          appointmentId,
          bookingCode: cleanBookingCode,
        });

        if (res.success && res.status === 'SUCCEEDED') {
          clearInterval(intervalId);
          setIsPaidSuccess(true);
          setCheckError(null);
          setPaidDetails({
            amount: res.amountPaid || activeAmount,
            txnRef: res.transactionRef,
          });

          // Thông báo thành công và gọi callback
          setTimeout(() => {
            if (onConfirmSuccess) onConfirmSuccess();
          }, 1800);
        }
      } catch (err) {
        // Im lặng trong quá trình polling
      }
    }, 2800);

    return () => clearInterval(intervalId);
  }, [isOpen, isPaidSuccess, appointmentId, cleanBookingCode, activeAmount, onConfirmSuccess]);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Kiểm tra trạng thái thanh toán thực tế (Chỉ cho phép xác nhận khi TIỀN ĐÃ VỀ)
  const handleCheckPaymentStatus = async () => {
    setCheckingStatus(true);
    setCheckError(null);

    try {
      const res = await api.checkRealPaymentStatus({
        appointmentId,
        bookingCode: cleanBookingCode,
      });

      if (res.success && res.status === 'SUCCEEDED') {
        setIsPaidSuccess(true);
        setPaidDetails({
          amount: res.amountPaid || activeAmount,
          txnRef: res.transactionRef,
        });
        setTimeout(() => {
          if (onConfirmSuccess) onConfirmSuccess();
        }, 1500);
      } else {
        // Chưa nhận được tiền -> TUYỆT ĐỐI KHÔNG CHO PHÉP XÁC NHẬN!
        setCheckError(
          `Hệ thống chưa ghi nhận số tiền ${activeAmount.toLocaleString(
            'vi-VN'
          )} đ vào tài khoản KienlongBank. Vui lòng mở App MoMo hoặc Ngân hàng để hoàn tất lệnh chuyển tiền với nội dung: "${transferContent}".`
        );
      }
    } catch (err: any) {
      setCheckError(err.message || 'Lỗi kiểm tra giao dịch từ hệ thống ngân hàng.');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Mô phỏng Webhook ngân hàng báo tiền về (Hỗ trợ Tester kiểm thử tự động)
  const handleSimulateWebhook = async () => {
    setSimulatingWebhook(true);
    try {
      await api.simulateBankWebhook({
        bookingCode: cleanBookingCode,
        amount: activeAmount,
        paymentType,
      });
      // Gọi kiểm tra lại ngay
      handleCheckPaymentStatus();
    } catch (err: any) {
      alert(`Lỗi giả lập: ${err.message || 'Lỗi kết nối'}`);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={18} className="text-emerald-300 shrink-0" />
            <span className="font-bold text-xs sm:text-sm tracking-tight truncate">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Màn hình thông báo thanh toán thành công */}
          {isPaidSuccess ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">Thanh Toán Đã Được Xác Nhận!</h3>
                <p className="text-xs text-slate-500">
                  Hệ thống MedSched đã xác thực tiền về tài khoản KienlongBank thành công qua Napas 247.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2 max-w-xs mx-auto text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã phiếu hẹn:</span>
                  <strong className="text-slate-800 font-mono font-bold">{cleanBookingCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hình thức:</span>
                  <strong className="text-emerald-800 font-semibold">
                    {paymentType === 'DEPOSIT' ? '🟢 Đặt cọc giữ chỗ' : '🔵 Trọn gói dịch vụ'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-emerald-200/60 pt-1.5">
                  <span className="text-slate-500">Số tiền thực nhận:</span>
                  <strong className="text-emerald-700 font-bold font-mono text-sm">
                    {(paidDetails?.amount || activeAmount).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check size={13} /> Đã Khớp Số Dư
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onConfirmSuccess) onConfirmSuccess();
                  onClose();
                }}
                className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          ) : (
            <>
              {/* Tab Selector: 2 Chế Độ Thanh Toán */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. Chọn Chế Độ Thanh Toán:</span>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Napas 247 Realtime
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {/* Option 1: Giữ Chỗ (DEPOSIT) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('DEPOSIT');
                      setCheckError(null);
                    }}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                      paymentType === 'DEPOSIT'
                        ? 'bg-white text-emerald-800 shadow-sm border border-emerald-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">🟢 Đặt cọc giữ chỗ</span>
                      {paymentType === 'DEPOSIT' && <Check size={14} className="text-emerald-600" />}
                    </div>
                    <div className="text-sm font-black text-emerald-700 font-mono mt-1">
                      {depositAmount.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">
                      Giữ slot chắc chắn, phần còn lại trả tại quầy
                    </span>
                  </button>

                  {/* Option 2: Thanh Toán Đủ (FULL) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('FULL');
                      setCheckError(null);
                    }}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                      paymentType === 'FULL'
                        ? 'bg-white text-blue-800 shadow-sm border border-blue-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">🔵 Thanh toán trọn gói</span>
                      {paymentType === 'FULL' && <Check size={14} className="text-blue-600" />}
                    </div>
                    <div className="text-sm font-black text-blue-700 font-mono mt-1">
                      {fullAmount.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">
                      Trả đủ 100%, ưu tiên vào khám ngay
                    </span>
                  </button>
                </div>
              </div>

              {/* Amount Display & Patient info */}
              <div className="text-center pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Số tiền cần chuyển:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono mt-0.5">
                  {activeAmount.toLocaleString('vi-VN')}{' '}
                  <span className="text-base sm:text-lg font-bold">VNĐ</span>
                </div>
                {patientName && (
                  <div className="text-xs text-slate-600 mt-0.5 font-medium">
                    Bệnh nhân: <strong className="text-slate-800">{patientName}</strong>
                  </div>
                )}
              </div>

              {/* VietQR Box */}
              <div className="text-center">
                <div className="bg-slate-50 border-2 border-dashed border-emerald-500/40 rounded-2xl p-3 inline-block shadow-inner relative group">
                  <img
                    src={vietQrUrl}
                    alt="Mã VietQR Thanh Toán Viện Phí"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl mx-auto shadow-sm bg-white p-1"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallbackEl = document.getElementById('vietqr-offline-fallback');
                      if (fallbackEl) fallbackEl.style.display = 'block';
                    }}
                  />
                  <div id="vietqr-offline-fallback" style={{ display: 'none' }} className="py-2">
                    <QrCodeImage
                      value={`2|99|${bankConfig.accountNo}|${bankConfig.accountName}|${activeAmount}|${transferContent}`}
                      size={180}
                      className="mx-auto rounded-lg shadow-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Chế độ tạo mã QR ngoại tuyến</span>
                  </div>

                  <div className="text-[11px] text-slate-600 font-medium mt-2 flex items-center justify-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Mở <strong>App Ngân hàng</strong> hoặc <strong>Ví MoMo</strong> quét mã</span>
                  </div>
                </div>

                {/* Polling Liveness Badge */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-teal-700 font-medium mt-1.5">
                  <Loader2 size={12} className="animate-spin text-teal-600" />
                  <span>Đang tự động lắng nghe giao dịch từ tài khoản...</span>
                </div>
              </div>

              {/* Account Details Box with 1-click Copy */}
              <div className="bg-slate-50 rounded-2xl p-3.5 text-left space-y-2 border border-slate-200 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Ngân hàng nhận:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-black rounded text-[10px]">
                      KLB
                    </span>
                    <strong className="text-slate-800 font-semibold">{bankConfig.bankName}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                    <span className="text-sm text-emerald-800 font-black">{bankConfig.accountNo}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankConfig.accountNo, 'account')}
                      className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'account' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Chủ tài khoản:</span>
                  <strong className="text-slate-800 font-semibold uppercase">{bankConfig.accountName}</strong>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800">
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs border border-emerald-300">
                      {transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferContent, 'content')}
                      className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                      title="Sao chép nội dung chuyển khoản"
                    >
                      {copiedField === 'content' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Cảnh báo khi người dùng bấm kiểm tra nhưng tiền chưa về */}
              {checkError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-2xl text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>Chưa Nhận Được Thanh Toán:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700">{checkError}</p>
                  <p className="text-[10px] text-rose-500 italic pt-0.5">
                    * Hệ thống chỉ cho phép xác nhận khi tài khoản ngân hàng thực tế nhận được tiền.
                  </p>
                </div>
              )}

              {/* Gợi ý test MoMo */}
              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2">
                <span className="text-amber-600 text-sm leading-none shrink-0">💡</span>
                <span>
                  <strong>Hướng dẫn:</strong> Mở App MoMo hoặc App Ngân hàng ➔ Chọn <strong>Quét Mã</strong> ➔ Quét mã QR KienlongBank ở trên. Sau khi chuyển xong, hệ thống sẽ tự động xác nhận số dư.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isPaidSuccess && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Để Sau / Đóng
              </button>
              <button
                type="button"
                disabled={checkingStatus}
                onClick={handleCheckPaymentStatus}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                title="Kiểm tra xem hệ thống ngân hàng đã nhận được số tiền chuyển khoản chưa"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang đối soát số dư...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Kiểm Tra Trạng Thái Thanh Toán</span>
                  </>
                )}
              </button>
            </div>

            {/* Công cụ hỗ trợ Tester giả lập Webhook nhanh khi cần test môi trường dev */}
            <div className="pt-1 text-center">
              <button
                type="button"
                disabled={simulatingWebhook}
                onClick={handleSimulateWebhook}
                className="text-[11px] text-slate-400 hover:text-amber-700 underline transition cursor-pointer inline-flex items-center gap-1"
                title="Dành riêng cho kiểm thử: Mô phỏng Webhook ngân hàng thông báo tiền đã vào tài khoản"
              >
                {simulatingWebhook ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Zap size={11} className="text-amber-500" />
                )}
                <span>Mô phỏng Webhook tiền về (Dành cho kiểm thử)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

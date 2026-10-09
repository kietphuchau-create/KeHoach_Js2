"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  QrCode,
  Copy,
  Check,
  Building2,
  X,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { api } from "@/shared/lib/api";
import { OFFICIAL_BANK_CONFIG } from "@/shared/components/VietQrModal";
import { QrCodeImage } from "@/shared/components/QrCodeImage";

function MockVnPayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);

  // Thông tin giao dịch
  const appointmentId = searchParams.get("appointmentId");
  const vnp_TxnRef = searchParams.get("vnp_TxnRef") || `TXN${Date.now()}`;
  const initialAmount = Number(searchParams.get("amount")) || 200000;

  // Cấu hình tài khoản ngân hàng chính thức của Trưởng nhóm
  const bankConfig = OFFICIAL_BANK_CONFIG;

  // Chế độ thanh toán: DEPOSIT hoặc FULL
  const [paymentType, setPaymentType] = useState<"DEPOSIT" | "FULL">("DEPOSIT");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const depositAmount = bankConfig.depositAmount;
  const fullAmount = initialAmount;
  const currentAmount = paymentType === "DEPOSIT" ? depositAmount : fullAmount;

  const bookingCodeParam = searchParams.get("bookingCode");
  const cleanCode = (bookingCodeParam || vnp_TxnRef || "MEDPAY").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const transferContent = `MEDPAY ${cleanCode}`;

  // URL VietQR Napas 247 KienlongBank
  const vietQrUrl = `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNo}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(bankConfig.accountName)}`;

  // Polling tự động kiểm tra xem tiền đã vào chưa
  useEffect(() => {
    if (!appointmentId || success) return;

    // Gửi khởi tạo thanh toán pending tới backend
    api.createRealPayment({
      appointmentId: appointmentId || undefined,
      bookingCode: cleanCode,
      paymentType,
      amount: currentAmount,
      method: "MOMO",
    }).catch(() => {});

    const timer = setInterval(async () => {
      try {
        const res = await api.checkRealPaymentStatus({
          appointmentId: appointmentId || undefined,
          bookingCode: cleanCode,
        });

        if (res.success && res.status === "SUCCEEDED") {
          clearInterval(timer);
          setSuccess(true);
          setCheckError(null);
          setTimeout(() => {
            router.push("/my-appointments");
          }, 2000);
        }
      } catch {
        // im lặng trong polling
      }
    }, 2800);

    return () => clearInterval(timer);
  }, [appointmentId, cleanCode, paymentType, currentAmount, success, router]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Kiểm tra trạng thái thanh toán nghiêm ngặt
  const handleCheckPaymentStatus = async () => {
    setLoading(true);
    setCheckError(null);
    try {
      const res = await api.checkRealPaymentStatus({
        appointmentId: appointmentId || undefined,
        bookingCode: cleanCode,
      });

      if (res.success && res.status === "SUCCEEDED") {
        setSuccess(true);
        setTimeout(() => {
          router.push("/my-appointments");
        }, 1800);
      } else {
        // Chưa nhận được tiền -> Tuyệt đối không cho xác nhận
        setCheckError(
          `Hệ thống chưa ghi nhận số tiền ${currentAmount.toLocaleString(
            "vi-VN"
          )} đ vào tài khoản KienlongBank (nội dung "${transferContent}"). Vui lòng kiểm tra lại lệnh chuyển khoản trên MoMo hoặc App Ngân hàng.`
        );
      }
    } catch (e: any) {
      setCheckError(e.message || "Lỗi kết nối kiểm tra giao dịch");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setSimulatingWebhook(true);
    try {
      await api.simulateBankWebhook({
        bookingCode: cleanCode,
        amount: currentAmount,
        paymentType,
      });
      handleCheckPaymentStatus();
    } catch (err: any) {
      alert(`Lỗi giả lập: ${err.message || "Lỗi hệ thống"}`);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const handleCancel = () => {
    router.push("/my-appointments");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Thanh Toán Đã Được Xác Nhận</h2>
          <p className="text-slate-500 text-sm">
            Hệ thống đã xác nhận nhận tiền <strong>{currentAmount.toLocaleString("vi-VN")} đ</strong> ({paymentType === "DEPOSIT" ? "Đặt cọc giữ chỗ" : "Trọn gói"}) vào tài khoản KienlongBank. Đang chuyển về trang lịch hẹn...
          </p>
          <div className="flex justify-center mt-4">
            <Loader2 className="animate-spin text-emerald-600" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-emerald-300" />
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-none">
                Cổng Thanh Toán MedSched Pay
              </h1>
              <p className="text-[11px] text-emerald-200 mt-0.5">VietQR Napas 247 &amp; Ví MoMo</p>
            </div>
          </div>
          <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-emerald-100 font-bold">
            KienlongBank
          </span>
        </div>

        {/* Chế độ thanh toán: Đặt cọc vs Trọn gói */}
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Hình Thức Thanh Toán:</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Napas 247 Chuyển Khoản Tức Thì
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPaymentType("DEPOSIT");
                  setCheckError(null);
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                  paymentType === "DEPOSIT"
                    ? "bg-white text-emerald-800 shadow-sm border border-emerald-400 font-bold"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">🟢 Đặt cọc giữ chỗ</span>
                  {paymentType === "DEPOSIT" && <Check size={14} className="text-emerald-600" />}
                </div>
                <div className="text-sm font-black text-emerald-700 font-mono mt-1">
                  {depositAmount.toLocaleString("vi-VN")} đ
                </div>
                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Giữ slot, còn lại trả tại quầy
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType("FULL");
                  setCheckError(null);
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                  paymentType === "FULL"
                    ? "bg-white text-blue-800 shadow-sm border border-blue-400 font-bold"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">🔵 Thanh toán trọn gói</span>
                  {paymentType === "FULL" && <Check size={14} className="text-blue-600" />}
                </div>
                <div className="text-sm font-black text-blue-700 font-mono mt-1">
                  {fullAmount.toLocaleString("vi-VN")} đ
                </div>
                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Ưu tiên thẳng vào buồng khám
                </span>
              </button>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="text-center">
            <div className="bg-slate-50 border-2 border-dashed border-emerald-500/40 rounded-2xl p-3 inline-block shadow-inner">
              <img
                src={vietQrUrl}
                alt="Mã VietQR Thanh Toán KienlongBank"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl mx-auto shadow-sm bg-white p-1"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallbackEl = document.getElementById("mock-vietqr-fallback");
                  if (fallbackEl) fallbackEl.style.display = "block";
                }}
              />
              <div id="mock-vietqr-fallback" style={{ display: "none" }} className="py-2">
                <QrCodeImage
                  value={`2|99|${bankConfig.accountNo}|${bankConfig.accountName}|${currentAmount}|${transferContent}`}
                  size={180}
                  className="mx-auto rounded-lg shadow-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Mã QR Ngoại Tuyến</span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-2 flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Mở <strong>App Ngân hàng</strong> hoặc <strong>Ví MoMo</strong> quét mã</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-teal-700 font-medium mt-1.5">
              <Loader2 size={12} className="animate-spin text-teal-600" />
              <span>Đang tự động lắng nghe giao dịch từ tài khoản...</span>
            </div>
          </div>

          {/* Account Details Box */}
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
                  onClick={() => handleCopy(bankConfig.accountNo, "account")}
                  className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copiedField === "account" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
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
                  onClick={() => handleCopy(transferContent, "content")}
                  className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                  title="Sao chép nội dung chuyển khoản"
                >
                  {copiedField === "content" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Cảnh báo khi bấm kiểm tra mà chưa có tiền */}
          {checkError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-2xl text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>Chưa Nhận Được Thanh Toán:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">{checkError}</p>
              <p className="text-[10px] text-rose-500 italic pt-0.5">
                * Chỉ khi hệ thống ngân hàng ghi nhận tiền vào tài khoản thực tế mới được phép xác nhận.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition text-xs cursor-pointer"
              >
                Hủy / Quay lại
              </button>
              <button
                onClick={handleCheckPaymentStatus}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold transition shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Kiểm Tra Trạng Thái</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-1">
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
        </div>

        <div className="bg-slate-50 p-3 text-center text-[11px] text-slate-500 border-t border-slate-200 px-5">
          <span>Hệ thống chỉ xác nhận khi tài khoản KienlongBank thực tế nhận được tiền.</span>
        </div>
      </div>
    </div>
  );
}

export default function MockVnPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Đang tải cổng thanh toán...</div>}>
      <MockVnPayContent />
    </Suspense>
  );
}

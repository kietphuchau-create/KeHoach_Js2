'use client';

import React, { useState } from 'react';
import { X, Check, Copy, QrCode, CreditCard, ShieldCheck, Building2, ExternalLink } from 'lucide-react';
import { QrCodeImage } from './QrCodeImage';

interface VietQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess?: () => void;
  title?: string;
  amount: number;
  description: string;
  bookingCode?: string;
  patientName?: string;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess,
  title = 'Thanh Toán Viện Phí Qua VietQR (Napas 247)',
  amount,
  description,
  bookingCode = 'MED-2026',
  patientName,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);

  if (!isOpen) return null;

  // Cấu hình tài khoản nhận viện phí của Bệnh viện MedSched
  const BANK_ID = 'MB'; // Ngân hàng Quân Đội (MBBank)
  const BANK_NAME = 'MBBank - Ngân Hàng Quân Đội';
  const ACCOUNT_NO = '0388999988';
  const ACCOUNT_NAME = 'BVDK MEDSCHED TONG HOP';

  const cleanAmount = Math.max(0, Math.round(amount));
  const transferContent = `MEDSCHED ${bookingCode.replace(/[^a-zA-Z0-9]/g, '')}`.toUpperCase();

  // URL VietQR chuẩn Napas 247
  const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      if (onConfirmSuccess) {
        onConfirmSuccess();
      }
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-emerald-300" />
            <span className="font-bold text-sm tracking-tight">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-center">
          {/* Amount Display */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Số tiền thanh toán
            </span>
            <div className="text-3xl font-black text-emerald-700 font-mono mt-0.5">
              {cleanAmount.toLocaleString('vi-VN')} <span className="text-lg">đ</span>
            </div>
            {patientName && (
              <div className="text-xs text-slate-600 mt-1 font-medium">
                Bệnh nhân: <strong className="text-slate-800">{patientName}</strong>
              </div>
            )}
          </div>

          {/* QR Code Container with Napas fallback */}
          <div className="bg-slate-50 border-2 border-dashed border-emerald-500/30 rounded-2xl p-4 inline-block shadow-inner">
            <img
              src={vietQrUrl}
              alt="Mã VietQR Thanh Toán Viện Phí"
              className="w-56 h-56 object-contain rounded-lg mx-auto shadow-xs"
              onError={(e) => {
                // Nếu không tải được ảnh từ vietqr.io (khi offline), chuyển sang render offline
                e.currentTarget.style.display = 'none';
                const fallbackEl = document.getElementById('vietqr-offline-fallback');
                if (fallbackEl) fallbackEl.style.display = 'block';
              }}
            />
            <div id="vietqr-offline-fallback" style={{ display: 'none' }} className="py-2">
              <QrCodeImage
                value={`2|99|${ACCOUNT_NO}|${ACCOUNT_NAME}|${cleanAmount}|${transferContent}`}
                size={220}
                className="mx-auto rounded-lg shadow-xs"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Chế độ tạo mã QR ngoại tuyến</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Quét bằng bất kỳ App Ngân hàng hoặc Ví MoMo/ZaloPay</span>
            </div>
          </div>

          {/* Account Details Box with 1-click Copy */}
          <div className="bg-slate-50 rounded-xl p-3 text-left space-y-2 border border-slate-200 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Ngân hàng:</span>
              <strong className="text-slate-800 font-semibold">{BANK_NAME}</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                <span>{ACCOUNT_NO}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(ACCOUNT_NO, 'account')}
                  className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copiedField === 'account' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Chủ tài khoản:</span>
              <strong className="text-slate-800 font-semibold uppercase">{ACCOUNT_NAME}</strong>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Nội dung CK:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800">
                <span className="bg-emerald-100 px-2 py-0.5 rounded text-[11px]">{transferContent}</span>
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
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng / Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            {confirmed ? (
              <>
                <Check size={15} />
                <span>Đã ghi nhận!</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Xác Nhận Đã Chuyển Khoản</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

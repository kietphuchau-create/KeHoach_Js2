'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeImageProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const QrCodeImage: React.FC<QrCodeImageProps> = ({
  value,
  size = 200,
  className = '',
  alt = 'QR Code',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x for retina sharpness
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error || !value) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2 rounded-lg border border-dashed border-slate-300 ${className}`}
      >
        Không thể tạo mã QR
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-50 text-slate-300 text-xs rounded-lg animate-pulse ${className}`}
      >
        Đang tạo QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
};

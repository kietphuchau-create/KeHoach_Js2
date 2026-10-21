'use client';

import React, { useState, useEffect } from 'react';
import BookingMethodSelector from './BookingMethodSelector';

interface BookingMethodModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialMode?: 'select' | 'ai';
}

export default function BookingMethodModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  initialMode = 'select',
}: BookingMethodModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'select' | 'ai'>(initialMode);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      if (e?.detail?.mode === 'ai') {
        setViewMode('ai');
      } else {
        setViewMode('select');
      }
      setInternalIsOpen(true);
    };

    // Kiểm tra nếu trên URL có tham số mở modal
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('selectMethod') === 'true' || params.get('bookingMethod') === 'true') {
        setInternalIsOpen(true);
      }
    }

    window.addEventListener('medsched:open-booking-method', handleOpenEvent);
    return () => {
      window.removeEventListener('medsched:open-booking-method', handleOpenEvent);
    };
  }, []);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <BookingMethodSelector
        isModal={true}
        onClose={handleClose}
        initialMode={viewMode}
      />
    </div>
  );
}

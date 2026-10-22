'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AppMainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isBookingMethodPage = pathname === '/booking-method';

  useEffect(() => {
    if (isBookingMethodPage) {
      const prevOverflow = document.body.style.overflow;
      const prevHeight = document.body.style.height;
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
      window.scrollTo(0, 0);
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.height = prevHeight;
      };
    }
  }, [isBookingMethodPage]);

  if (isHomePage) {
    return (
      <main className="flex-1 w-full flex flex-col overflow-x-hidden">
        {children}
      </main>
    );
  }

  if (isBookingMethodPage) {
    return (
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-5 py-1 sm:py-1.5 flex flex-col overflow-hidden h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4.6rem)] max-h-[calc(100dvh-3.5rem)] md:max-h-[calc(100dvh-4.6rem)]">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col overflow-x-hidden">
      {children}
    </main>
  );
}

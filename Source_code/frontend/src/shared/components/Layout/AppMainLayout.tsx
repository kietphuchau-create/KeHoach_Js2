'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function AppMainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  if (isHomePage) {
    return (
      <main className="flex-1 w-full flex flex-col overflow-x-hidden">
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

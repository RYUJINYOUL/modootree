'use client';

import LoginOutButton from '@/components/ui/LoginOutButton';

export default function ClientLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LoginOutButton />
      {children}
    </>
  );
}

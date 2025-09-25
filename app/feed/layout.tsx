import LoginOutButton from '@/components/ui/LoginOutButton';
import Header from '@/components/Header';

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LoginOutButton />
      <Header />
      {children}
    </>
  );
}

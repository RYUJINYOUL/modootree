import Header from '@/components/Header';
import CollapsibleFooter from '@/components/ui/CollapsibleFooter';
import LoginOutButton from '@/components/ui/LoginOutButton';

export default function ModooAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LoginOutButton />
      <Header />
      {children}
      <CollapsibleFooter />
    </>
  );
}

import Header from '@/components/Header';
import CollapsibleFooter from '@/components/ui/CollapsibleFooter';
import LoginOutButton from '@/components/ui/LoginOutButton';
import ClientLayout from '@/components/ClientLayout';

export default function ModooAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientLayout>
      <LoginOutButton />
      <Header />
      {children}
      <CollapsibleFooter />
    </ClientLayout>
  );
}

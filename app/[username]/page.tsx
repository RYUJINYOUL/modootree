// app/[username]/page.tsx
import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import Link from 'next/link';
import UserEditButton from '@/components/ui/UserEditButton';
import ThemeToggle from '@/components/ThemeToggle';

type Props = Promise<{ username: string }>;

export default async function UserPublicPage({ params }: {params :Props}) {
  const { username } = await params;

  const userSnap = await getDoc(
    doc(db, 'usernames', username)
  );
  
  if (!userSnap.exists) return notFound();

  const data = userSnap.data();
  const uid = data?.uid;
  
 const linksDocRef = doc(db, 'users', uid, 'links', 'page');
 const linksSnap = await getDoc(linksDocRef);
 const components = linksSnap.exists() ? linksSnap.data().components || [] : [];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative" style={{ backgroundColor: 'var(--page-background, white)' }}>
      <ThemeToggle />
     <div className="md:w-[1000px] w-full px-[10px]">   
      {components.map((type: string, i: number) => {
          const Component = ComponentLibrary[type as keyof typeof ComponentLibrary];
          return Component && <Component key={i} username={username} uid={uid} />;
      })}
    </div>
    <div className='h-[50px]'></div>
      <UserEditButton username={username} ownerUid={uid} />
    </main>
  );
}
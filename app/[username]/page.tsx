// app/[username]/page.tsx
import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { ComponentLibrary } from '@/components/edit/ComponentLibrary';
import Link from 'next/link';

type Props = Promise<{ username: string }>;

export default async function UserPublicPage({ params }: {params :Props}) {
  const { username } = await params;

  // username으로 해당 사용자 UID 찾기
  const userSnap = await getDocs(
    query(collection(db, 'users'), where('username', '==', username))
  );

  if (userSnap.empty) return notFound();

  const userDoc = userSnap.docs[0];
  const uid = userDoc.id;
  const userData = userDoc.data();

  // 해당 사용자의 links 서브컬렉션 불러오기
 const linksDocRef = doc(db, 'users', uid, 'links', 'page');
 const linksSnap = await getDoc(linksDocRef);
 const components = linksSnap.exists() ? linksSnap.data().components || [] : [];

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative">
      <h1 className="text-3xl font-bold mb-4">{userData.username}님의 링크트리</h1>
     <div className="space-y-3 w-full max-w-sm">
      {components.map((type: string, i: number) => {
        const Comp = ComponentLibrary[type as keyof typeof ComponentLibrary];
        return Comp ? <Comp key={i} /> : null;
      })}
    </div>

      {/* ✨ Floating Action Button */}
      <Link
        href={`/editor/${username}`}
        className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition"
      >
        ✏️
      </Link>
    </main>
  );
}

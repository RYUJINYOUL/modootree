// 'use client';

// import React, { useRef, useState, useEffect } from 'react';
// import { usePathname } from 'next/navigation';
// import { doc, getDoc, setDoc } from 'firebase/firestore';
// import { db } from '../../firebase';
// import Image from 'next/image';
// import { useSelector } from 'react-redux';
// import { cn } from '@/lib/utils';
// import { uploadLinkImage } from '@/hooks/useUploadImage';

// interface LinkData {
//   image: string;
//   title: string;
//   links: string;
// }

// export default function LinkCards() {
//   const pathname = usePathname();
//   const isEditable = pathname.startsWith('/editor');
//   const { currentUser } = useSelector((state: any) => state.user);
//   const uid = currentUser?.uid;
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const [linkData, setLinkData] = useState<LinkData>({
//     image: '/new/upload.png',
//     title: '제목을 입력하세요',
//     links: '링크를 입력하세요',
//   });

//   const docId = 'link1'; // ✅ 고정된 문서 ID로 설정

//   useEffect(() => {
//     const fetchLinks = async () => {
//       if (!uid) return;
//       try {
//         const docRef = doc(db, 'users', uid, 'info', docId);
//         const snap = await getDoc(docRef);
//         if (snap.exists()) {
//           const data = snap.data();
//           setLinkData({
//             image: data.image || '/new/upload.png',
//             title: data.title || '제목을 입력하세요',
//             links: data.links || '링크를 입력하세요',
//           });
//         }
//       } catch (err) {
//         console.error('설정 불러오기 실패:', err);
//       }
//     };
//     fetchLinks();
//   }, [uid]);

//   const saveLinkData = async (newData: Partial<LinkData>) => {
//     if (!uid) return;
//     const updated = { ...linkData, ...newData };
//     setLinkData(updated);
//     try {
//       const docRef = doc(db, 'users', uid, 'info', docId); // ✅ 고정된 ID 사용
//       await setDoc(docRef, updated, { merge: true });
//       alert('저장되었습니다.');
//     } catch (err) {
//       console.error('저장 실패:', err);
//       alert('저장 실패');
//     }
//   };

//   const onClickLogoImage = () => {
//     if (!isEditable) return;
//     fileInputRef.current?.click();
//   };

//   const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     try {
//       const url = await uploadLinkImage(file);
//       await saveLinkData({ image: url });
//     } catch (err) {
//       console.error('로고 업로드 실패:', err);
//       alert('업로드 실패');
//     }
//   };

//   const onClickTitle = async () => {
//     if (!isEditable) return;
//     const newTitle = prompt('새 제목을 입력하세요', linkData.title);
//     if (!newTitle) return;
//     await saveLinkData({ title: newTitle });
//   };

//   const onClickLink = async () => {
//     if (!isEditable) return;
//     const newLink = prompt('새 링크를 입력하세요', linkData.links);
//     if (!newLink) return;
//     await saveLinkData({ links: newLink });
//   };

//   return (
//     <section className="items-center">
//       <input
//         type="file"
//         accept="image/*"
//         onChange={onFileChange}
//         ref={fileInputRef}
//         className="hidden"
//       />

//       <div className="flex flex-row items-center space-x-4 p-4 bg-white rounded-2xl shadow">
//         <Image
//           className={cn(
//             'rounded-2xl w-[40px] h-[40px] object-cover',
//             isEditable
//               ? 'cursor-pointer hover:opacity-80 ring-1 ring-transparent hover:ring-blue-400 transition'
//               : 'cursor-default'
//           )}
//           alt="link-image"
//           width={40}
//           height={40}
//           src={linkData.image}
//           onClick={onClickLogoImage}
//         />

//         <div
//           className={cn(
//             'font-semibold text-[18px] transition',
//             pathname !== '/' ? 'text-black' : 'text-white',
//             isEditable ? 'cursor-pointer hover:underline hover:text-blue-500' : 'cursor-default'
//           )}
//           onClick={onClickTitle}
//         >
//           {linkData.title}
//         </div>

//         {isEditable && (
//           <div
//             className={cn(
//               'ml-auto text-sm text-blue-600 underline cursor-pointer hover:text-blue-400'
//             )}
//             onClick={onClickLink}
//           >
//             {linkData.links}
//           </div>
//         )}
//       </div>
//     </section>
//   );
// }

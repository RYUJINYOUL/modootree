'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import app from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

const db = getFirestore(app);

export default function Settings() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const currentUser = useSelector((state: any) => state?.user?.currentUser) ?? null;
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!currentUser?.uid) {
      router.push('/login');
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid, 'settings', 'permissions'),
      (doc) => {
        if (doc.exists()) {
          setAllowedUsers(doc.data().allowedUsers || []);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser, router, mounted]);

  if (!mounted || !currentUser) {
    return null;
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !currentUser?.uid) return;

    try {
      // username으로 사용자 찾기
      const usernameDoc = await getDoc(doc(db, 'usernames', newUsername));
      
      if (!usernameDoc.exists()) {
        setError('존재하지 않는 사용자입니다.');
        return;
      }

      const permissionsRef = doc(db, 'users', currentUser.uid, 'settings', 'permissions');
      const permissionsDoc = await getDoc(permissionsRef);
      
      let currentAllowedUsers = [];
      if (permissionsDoc.exists()) {
        currentAllowedUsers = permissionsDoc.data().allowedUsers || [];
      }

      if (currentAllowedUsers.includes(newUsername)) {
        setError('이미 등록된 사용자입니다.');
        return;
      }

      await setDoc(permissionsRef, {
        allowedUsers: [...currentAllowedUsers, newUsername]
      });

      setNewUsername('');
      setError('');
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      setError('사용자 추가에 실패했습니다.');
    }
  };

  const handleRemoveUser = async (usernameToRemove: string) => {
    if (!currentUser?.uid) return;

    try {
      const permissionsRef = doc(db, 'users', currentUser.uid, 'settings', 'permissions');
      await setDoc(permissionsRef, {
        allowedUsers: allowedUsers.filter(username => username !== usernameToRemove)
      });
    } catch (error) {
      console.error('사용자 제거 실패:', error);
      setError('사용자 제거에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen pt-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-6">설정</h1>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">초대 사용자 관리</h2>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="사용자 아이디 입력"
                  className="flex-1 bg-blue-500/20 border-none text-white placeholder-white/50"
                />
                <Button
                  type="submit"
                  className="bg-blue-500/30 text-white hover:bg-blue-500/40"
                >
                  추가
                </Button>
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </form>

            <div className="space-y-2">
              {allowedUsers.map((username) => (
                <div
                  key={username}
                  className="flex items-center justify-between p-3 bg-blue-500/30 rounded-xl"
                >
                  <span className="text-white">{username}</span>
                  <Button
                    onClick={() => handleRemoveUser(username)}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-blue-500/40"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {allowedUsers.length === 0 && (
                <p className="text-white/70 text-center py-4">
                  등록된 사용자가 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
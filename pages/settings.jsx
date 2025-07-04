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

const db = getFirestore(app);

const Settings = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    // 허용된 사용자 목록 실시간 업데이트
    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid, 'settings', 'permissions'),
      (doc) => {
        if (doc.exists()) {
          setAllowedUsers(doc.data().allowedUsers || []);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !currentUser?.uid) return;

    try {
      // 현재 허용된 사용자 목록 가져오기
      const permissionsRef = doc(db, 'users', currentUser.uid, 'settings', 'permissions');
      const permissionsDoc = await getDoc(permissionsRef);
      
      let currentAllowedUsers = [];
      if (permissionsDoc.exists()) {
        currentAllowedUsers = permissionsDoc.data().allowedUsers || [];
      }

      // 이미 존재하는 이메일인지 확인
      if (currentAllowedUsers.includes(newUserEmail)) {
        setError('이미 등록된 사용자입니다.');
        return;
      }

      // 새로운 사용자 추가
      await setDoc(permissionsRef, {
        allowedUsers: [...currentAllowedUsers, newUserEmail]
      });

      setNewUserEmail('');
      setError('');
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      setError('사용자 추가에 실패했습니다.');
    }
  };

  const handleRemoveUser = async (emailToRemove) => {
    if (!currentUser?.uid) return;

    try {
      const permissionsRef = doc(db, 'users', currentUser.uid, 'settings', 'permissions');
      await setDoc(permissionsRef, {
        allowedUsers: allowedUsers.filter(email => email !== emailToRemove)
      });
    } catch (error) {
      console.error('사용자 제거 실패:', error);
      setError('사용자 제거에 실패했습니다.');
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-6">설정</h1>
          
          {/* 허용된 사용자 관리 섹션 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">허용된 사용자 관리</h2>
            
            {/* 사용자 추가 폼 */}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="사용자 이메일 입력"
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

            {/* 허용된 사용자 목록 */}
            <div className="space-y-2">
              {allowedUsers.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 bg-blue-500/30 rounded-xl"
                >
                  <span className="text-white">{email}</span>
                  <Button
                    onClick={() => handleRemoveUser(email)}
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
};

export default Settings; 
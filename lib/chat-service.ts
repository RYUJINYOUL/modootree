import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase'; // Assuming you have a firebase initialization file

export interface AnonymousRoom {
  id: string;
  title: string;
  creatorId: string;
  createdAt: Date;
  bannedUsers?: string[]; // 강퇴된 사용자 UID 목록
  category?: string; // 채팅방 카테고리 (공동구매, 취미, 스터디 등)
  maxParticipants?: number; // 최대 참여자 수
}

export interface Message {
  id: string;
  userId: string; // The actual user ID, for moderation or other purposes
  nickname: string; // The anonymous nickname to display
  text: string;
  createdAt: Timestamp;
}

// 닉네임 풀 - 형용사 + 명사 조합으로 다양한 익명 닉네임 생성
const ADJECTIVES = [
  '빨간', '노란', '초록', '파란', '보라', '하얀', '검은', '분홍', '주황', '갈색',
  '귀여운', '용감한', '조용한', '활발한', '신비로운', '즐거운', '지혜로운', '친절한',
  '빠른', '느린', '큰', '작은', '밝은', '어두운', '따뜻한', '차가운',
  '행복한', '슬픈', '화난', '놀란', '졸린', '배고픈', '배부른', '목마른'
];

const NOUNS = [
  '사과', '바나나', '포도', '블루베리', '가지', '무', '당근', '올리브', '복숭아', '밤',
  '고양이', '강아지', '토끼', '다람쥐', '여우', '곰', '사자', '호랑이', '판다', '코알라',
  '펭귄', '독수리', '부엉이', '까마귀', '참새', '앵무새', '비둘기', '까치',
  '거북이', '물고기', '돌고래', '고래', '상어', '문어', '해파리', '새우',
  '나비', '벌', '무당벌레', '개미', '잠자리', '매미',
  '장미', '해바라기', '튤립', '민들레', '코스모스', '국화'
];

// 동적 닉네임 생성 함수
function generateNicknamePool(): string[] {
  const pool: string[] = [];
  for (const adj of ADJECTIVES) {
    for (const noun of NOUNS) {
      pool.push(`${adj} ${noun}`);
    }
  }
  return pool;
}

const NICKNAME_POOL = generateNicknamePool(); // 약 1,680개 (28 형용사 × 60 명사)의 조합 생성

/**
 * A map to cache assigned nicknames for a user in a specific room.
 * Key: `${roomId}-${userId}`
 * Value: The assigned nickname.
 */
const nicknameCache = new Map<string, string>();

/**
 * Creates a new anonymous chat room.
 * @param title The title of the room.
 * @param creatorId The ID of the user creating the room.
 * @param category Optional category for the room.
 * @param maxParticipants Optional maximum number of participants.
 * @returns The ID of the newly created room.
 */
export async function createAnonymousRoom(
  title: string,
  creatorId: string,
  category?: string,
  maxParticipants?: number
): Promise<string> {
  const roomsCollection = collection(db, 'anonymous_rooms');
  const docRef = await addDoc(roomsCollection, {
    title,
    creatorId,
    createdAt: serverTimestamp(),
    bannedUsers: [],
    category: category || '일반',
    maxParticipants: maxParticipants || 50,
  });
  return docRef.id;
}

/**
 * Fetches a list of all anonymous chat rooms, ordered by creation date.
 * @returns A promise that resolves to an array of AnonymousRoom objects.
 */
export async function getAnonymousRooms(): Promise<AnonymousRoom[]> {
  const roomsCollection = collection(db, 'anonymous_rooms');
  const q = query(roomsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title,
    creatorId: doc.data().creatorId,
    createdAt: doc.data().createdAt.toDate(),
  }));
}

/**
 * Sends a message in an anonymous chat room.
 * @param roomId The ID of the room.
 * @param userId The actual ID of the user sending the message.
 * @param nickname The anonymous nickname of the user.
 * @param text The message content.
 */
export async function sendMessage(
  roomId: string,
  userId: string,
  nickname: string,
  text: string
): Promise<void> {
  const messagesCollection = collection(db, 'anonymous_rooms', roomId, 'messages');
  await addDoc(messagesCollection, {
    userId,
    nickname,
    text,
    createdAt: serverTimestamp(),
  });
}

/**
 * Retrieves the nickname for a user in a room. If not assigned, it assigns a new one.
 * This function uses a transaction to prevent race conditions when assigning nicknames.
 *
 * @param roomId The ID of the chat room.
 * @param userId The ID of the user.
 * @returns The assigned anonymous nickname.
 * @throws If no available nicknames are left.
 */
export async function getOrAssignNickname(
  roomId: string,
  userId: string
): Promise<string> {
  const cacheKey = `${roomId}-${userId}`;
  if (nicknameCache.has(cacheKey)) {
    return nicknameCache.get(cacheKey)!;
  }

  const roomRef = doc(db, 'anonymous_rooms', roomId);
  const participantRef = doc(roomRef, 'participants', userId);

  try {
    // 먼저 트랜잭션 밖에서 현재 할당된 닉네임들을 조회
    const participantsCol = collection(roomRef, 'participants');
    const participantsSnapshot = await getDocs(participantsCol);
    const assignedNicknames = new Set(
      participantsSnapshot.docs.map((doc) => doc.data().nickname)
    );

    const nickname = await runTransaction(db, async (transaction) => {
      // 1. Check if the user already has a nickname in this room.
      const participantDoc = await transaction.get(participantRef);
      if (participantDoc.exists()) {
        const existingNickname = participantDoc.data().nickname;
        // Cache the result before returning
        nicknameCache.set(cacheKey, existingNickname);
        return existingNickname;
      }

      // 2. Find an available nickname.
      const availableNickname = NICKNAME_POOL.find(
        (name) => !assignedNicknames.has(name)
      );

      if (!availableNickname) {
        // All nicknames are taken. In a real-world scenario, you might want to
        // expand the pool or generate dynamic nicknames.
        throw new Error('No available nicknames in this room.');
      }

      // 3. Assign the new nickname within the transaction.
      transaction.set(participantRef, {
        userId: userId,
        nickname: availableNickname,
        createdAt: serverTimestamp(),
      });

      // Cache the result before returning
      nicknameCache.set(cacheKey, availableNickname);
      return availableNickname;
    });

    return nickname;
  } catch (error) {
    console.error('Error assigning nickname:', error);
    // As a fallback for errors (e.g., transaction failure), return a default name.
    // This prevents the chat from breaking, but the user might not have a persistent name.
    return '익명 사용자';
  }
}

/**
 * 특정 사용자를 채팅방에서 강퇴 (차단)
 * @param roomId 채팅방 ID
 * @param userIdToBan 강퇴할 사용자의 UID
 * @param requestingUserId 요청하는 사용자의 UID (방장 확인용)
 */
export async function banUserFromRoom(
  roomId: string,
  userIdToBan: string,
  requestingUserId: string
): Promise<void> {
  const roomRef = doc(db, 'anonymous_rooms', roomId);
  const roomDoc = await getDoc(roomRef);

  if (!roomDoc.exists()) {
    throw new Error('채팅방을 찾을 수 없습니다.');
  }

  const roomData = roomDoc.data();
  if (roomData.creatorId !== requestingUserId) {
    throw new Error('방장만 사용자를 강퇴할 수 있습니다.');
  }

  const currentBannedUsers = roomData.bannedUsers || [];
  if (!currentBannedUsers.includes(userIdToBan)) {
    await runTransaction(db, async (transaction) => {
      transaction.update(roomRef, {
        bannedUsers: [...currentBannedUsers, userIdToBan],
      });
    });
  }
}

/**
 * 강퇴된 사용자를 차단 해제
 * @param roomId 채팅방 ID
 * @param userIdToUnban 차단 해제할 사용자의 UID
 * @param requestingUserId 요청하는 사용자의 UID (방장 확인용)
 */
export async function unbanUserFromRoom(
  roomId: string,
  userIdToUnban: string,
  requestingUserId: string
): Promise<void> {
  const roomRef = doc(db, 'anonymous_rooms', roomId);
  const roomDoc = await getDoc(roomRef);

  if (!roomDoc.exists()) {
    throw new Error('채팅방을 찾을 수 없습니다.');
  }

  const roomData = roomDoc.data();
  if (roomData.creatorId !== requestingUserId) {
    throw new Error('방장만 차단을 해제할 수 있습니다.');
  }

  const currentBannedUsers = roomData.bannedUsers || [];
  await runTransaction(db, async (transaction) => {
    transaction.update(roomRef, {
      bannedUsers: currentBannedUsers.filter((uid: string) => uid !== userIdToUnban),
    });
  });
}

/**
 * 사용자가 특정 채팅방에서 차단되었는지 확인
 * @param roomId 채팅방 ID
 * @param userId 확인할 사용자 UID
 * @returns 차단 여부
 */
export async function isUserBanned(
  roomId: string,
  userId: string
): Promise<boolean> {
  const roomRef = doc(db, 'anonymous_rooms', roomId);
  const roomDoc = await getDoc(roomRef);

  if (!roomDoc.exists()) {
    return false;
  }

  const bannedUsers = roomDoc.data().bannedUsers || [];
  return bannedUsers.includes(userId);
}

/**
 * 채팅방의 상세 정보 가져오기
 * @param roomId 채팅방 ID
 * @returns 채팅방 정보
 */
export async function getRoomDetails(roomId: string): Promise<AnonymousRoom | null> {
  const roomRef = doc(db, 'anonymous_rooms', roomId);
  const roomDoc = await getDoc(roomRef);

  if (!roomDoc.exists()) {
    return null;
  }

  const data = roomDoc.data();
  return {
    id: roomDoc.id,
    title: data.title,
    creatorId: data.creatorId,
    createdAt: data.createdAt.toDate(),
    bannedUsers: data.bannedUsers || [],
    category: data.category || '일반',
    maxParticipants: data.maxParticipants || 50,
  };
}

/**
 * 채팅방의 현재 참여자 수 확인
 * @param roomId 채팅방 ID
 * @returns 현재 참여자 수
 */
export async function getParticipantCount(roomId: string): Promise<number> {
  const participantsCol = collection(db, 'anonymous_rooms', roomId, 'participants');
  const snapshot = await getDocs(participantsCol);
  return snapshot.size;
}

/**
 * 카테고리별 채팅방 목록 가져오기
 * @param category 카테고리 (선택사항, 없으면 전체)
 * @returns 필터링된 채팅방 목록
 */
export async function getRoomsByCategory(category?: string): Promise<AnonymousRoom[]> {
  const allRooms = await getAnonymousRooms();
  if (!category || category === '전체') {
    return allRooms;
  }
  return allRooms.filter(room => room.category === category);
}

import { db } from '@/firebase';
import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

export async function incrementVisitCount(uid: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statsRef = doc(db, 'users', uid, 'statistics', 'visits');
    const statsDoc = await getDoc(statsRef);

    if (!statsDoc.exists()) {
      // 첫 방문인 경우
      await setDoc(statsRef, {
        totalVisits: 1,
        todayVisits: 1,
        lastVisited: serverTimestamp(),
        lastVisitDate: today.getTime()
      });
    } else {
      const data = statsDoc.data();
      const lastVisitDate = new Date(data.lastVisitDate);
      lastVisitDate.setHours(0, 0, 0, 0);

      if (lastVisitDate.getTime() === today.getTime()) {
        // 오늘 이미 방문한 경우
        await setDoc(statsRef, {
          totalVisits: increment(1),
          todayVisits: increment(1),
          lastVisited: serverTimestamp()
        }, { merge: true });
      } else {
        // 새로운 날의 첫 방문인 경우
        await setDoc(statsRef, {
          totalVisits: increment(1),
          todayVisits: 1,
          lastVisited: serverTimestamp(),
          lastVisitDate: today.getTime()
        }, { merge: true });
      }
    }
  } catch (error) {
    console.error('방문자 수 업데이트 실패:', error);
  }
}




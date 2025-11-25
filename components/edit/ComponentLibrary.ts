import React from 'react';
import Gallery3 from '../template/Gallery3';
import CalendarComponent from '../template/Calendar';
import LinkCard from '../template/LinkCard';
import QuestBook from '../template/QuestBook';
import SnsButtons from '../template/SnsButtons';
import TodayDiary from '../template/TodayDiary';
import ImageCarousel from '../template/ImageCarousel';
import QuestBook2 from '../template/QuestBook2';
import PersonaFeed from '../template/PersonaFeed';

export type ComponentKey = 
  '프로필카드'
  | 'SNS카드'
  | '사진첩'
  | '링크카드'
  | '게스트북'
  | '커뮤니티'
  | '작은일정표'
  | '커플일기'
  | '매거진';

export const ComponentLibrary: Record<ComponentKey, React.FC<any>> = {
  프로필카드: Gallery3,
  SNS카드: SnsButtons,
  사진첩: ImageCarousel,
  링크카드: LinkCard,
  게스트북: QuestBook,
  커뮤니티: QuestBook2,
  작은일정표: CalendarComponent,
  커플일기: TodayDiary,
  매거진: PersonaFeed,
}; 
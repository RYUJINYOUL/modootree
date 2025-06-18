import GalleryComponent from '../Gallery3';
import Logo from '../elements/Logo2';
import ReviewComponent from '../Review';
import CalendarComponent from '../template/Calendar';
import LinkCard from '../template/LinkCard';
import QuestBook from '../template/QuestBook'





export const ComponentLibrary: Record<string, React.FC<any>> = {
  이미지: GalleryComponent,
  링크카드:LinkCard,
  게스트북:QuestBook,
  로그:Logo,
  리뷰쓰기: ReviewComponent,
  달력: CalendarComponent
};
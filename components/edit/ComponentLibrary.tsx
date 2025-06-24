import Gallery3 from '../template/Gallery3';
import CalendarComponent from '../template/Calendar';
import Calendar2 from '../template/Calendar2';
import LinkCard from '../template/LinkCard';
import QuestBook from '../template/QuestBook';
import QuestBook2 from '../template/QuestBook2';
import SnsButtons from '../template/SnsButtons';
import Diary from '../template/Diary';
import ImageCarousel from '../template/ImageCarousel';

export const ComponentLibrary: Record<string, React.FC<any>> = {
  이미지: Gallery3,
  링크카드: LinkCard,
  게스트북: QuestBook,
  게스트북2: QuestBook2,
  달력: CalendarComponent,
  달력2: Calendar2,
  연락처: SnsButtons,
  일기장: Diary,
  사진첩: ImageCarousel
}; 
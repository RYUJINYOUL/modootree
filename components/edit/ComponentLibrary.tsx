import Gallery3 from '../template/Gallery3';
import CalendarComponent from '../template/Calendar';
import LinkCard from '../template/LinkCard';
import QuestBook from '../template/QuestBook';
import SnsButtons from '../template/SnsButtons';
import Diary from '../template/Diary';
import ImageCarousel from '../template/ImageCarousel';

export const ComponentLibrary: Record<string, React.FC<any>> = {
  이미지: Gallery3,
  링크카드: LinkCard,
  게스트북: QuestBook,
  달력: CalendarComponent,
  연락처: SnsButtons,
  일기장: Diary,
  사진첩: ImageCarousel
}; 
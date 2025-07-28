import Gallery3 from '../template/Gallery3';
import CalendarComponent from '../template/Calendar';
import LinkCard from '../template/LinkCard';
import QuestBook from '../template/QuestBook';
import SnsButtons from '../template/SnsButtons';
import Diary from '../template/Diary';
import ImageCarousel from '../template/ImageCarousel';
import VoteComponent from '../template/VoteComponent';

export const ComponentLibrary: Record<string, React.FC<any>> = {
  프로필카드: Gallery3,
  SNS카드: SnsButtons,
  사진첩: ImageCarousel,
  링크카드: LinkCard,
  게스트북: QuestBook,
  달력: CalendarComponent,
  일기장: Diary,
  투표: VoteComponent
}; 
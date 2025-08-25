import Gallery3 from '../template/Gallery3';
import CalendarComponent from '../template/Calendar';
import LinkCard from '../template/LinkCard';
import QuestBook from '../template/QuestBook';
import SnsButtons from '../template/SnsButtons';
import Diary from '../template/Diary';
import TodayDiary from '../template/TodayDiary';
import ImageCarousel from '../template/ImageCarousel';
import Title from '../template/Title';
import Description from '../template/Description';
import Divider from '../template/Divider';
import QuestBook2 from '../template/QuestBook2';
import SkillProgress from '../template/SkillProgress';


export const ComponentLibrary: Record<string, React.FC<any>> = {
  제목: Title,
  설명: Description,
  구분선: Divider,
  프로필카드: Gallery3,
  SNS카드: SnsButtons,
  사진첩: ImageCarousel,
  링크카드: LinkCard,
  게스트북: QuestBook,
  자유게시판:QuestBook2,
  달력: CalendarComponent,
  일기장: Diary,
  오늘일기: TodayDiary,
  포트폴리오: SkillProgress,
}; 
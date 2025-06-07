import GalleryComponent from '../Gallery3';
import Logo from '../elements/Logo2';
import ReviewComponent from '../Review';
import CalendarComponent from '../template/Calendar';





export const ComponentLibrary: Record<string, React.FC<any>> = {
  이미지: GalleryComponent,
  로그:Logo,
  리뷰쓰기: ReviewComponent,
  달력: CalendarComponent
};
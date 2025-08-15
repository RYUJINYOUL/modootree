import { create } from "zustand";

const useUIState = create((set) => ({
  homeCategory2: "다함단식하우스",
  headerImageSrc2:
    "/Image/high.jpg",
  setHomeCategory2: (value) => set({ homeCategory2: value }),
  setHeaderImageSrc2: (src) => set({ headerImageSrc2: src }),
}));

export default useUIState;

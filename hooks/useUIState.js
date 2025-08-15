import { create } from "zustand";

const useUIState = create((set) => ({
  homeCategory: "강대리빙텔",
  headerImageSrc:
    "/",
  setHomeCategory: (value) => set({ homeCategory: value }),
  setHeaderImageSrc: (src) => set({ headerImageSrc: src }),
}));

export default useUIState;

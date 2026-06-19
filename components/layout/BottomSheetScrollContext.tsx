import { createContext, useContext } from 'react';
import type { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export type BottomSheetScrollRef = KeyboardAwareScrollView | null;

const BottomSheetScrollContext = createContext<BottomSheetScrollRef>(null);

export function useBottomSheetScroll() {
  return useContext(BottomSheetScrollContext);
}

export const BottomSheetScrollProvider = BottomSheetScrollContext.Provider;

import { createContext, useContext } from 'react';
import type { TextInput } from 'react-native';

export type BottomSheetScrollController = {
  scrollToInput: (input: TextInput | null, meta?: { field?: string }) => void;
};

const BottomSheetScrollContext = createContext<BottomSheetScrollController | null>(null);

export function useBottomSheetScroll() {
  return useContext(BottomSheetScrollContext);
}

export const BottomSheetScrollProvider = BottomSheetScrollContext.Provider;
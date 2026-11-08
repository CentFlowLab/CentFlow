import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

import { fontFamily } from './typography';

/** Apenas os pesos usados, importados individualmente para não inflacionar o bundle. */
export const appFonts = {
  [fontFamily.regular]: Inter_400Regular,
  [fontFamily.medium]: Inter_500Medium,
  [fontFamily.semibold]: Inter_600SemiBold,
  [fontFamily.bold]: Inter_700Bold,
};

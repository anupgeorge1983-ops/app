import { useFonts } from 'expo-font';
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_400Regular_Italic,
  Lora_500Medium_Italic,
} from '@expo-google-fonts/lora';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_400Regular_Italic,
    Lora_500Medium_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

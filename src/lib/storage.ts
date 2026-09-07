import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Profile } from '@/rules/f1';

const KEY = 'f1-timeline:profile:v1';

type StoredProfile = {
  admissionBasis: Profile['admissionBasis'];
  degreeIsStem: boolean;
  programStartDate: string;
  programEndDate: string;
  lastI20SignatureDate?: string;
  opt?: { startDate: string; endDate: string };
};

export async function saveProfile(profile: Profile): Promise<void> {
  const stored: StoredProfile = {
    admissionBasis: profile.admissionBasis,
    degreeIsStem: profile.degreeIsStem,
    programStartDate: profile.programStartDate.toISOString(),
    programEndDate: profile.programEndDate.toISOString(),
    lastI20SignatureDate: profile.lastI20SignatureDate?.toISOString(),
    opt: profile.opt
      ? {
          startDate: profile.opt.startDate.toISOString(),
          endDate: profile.opt.endDate.toISOString(),
        }
      : undefined,
  };

  await AsyncStorage.setItem(KEY, JSON.stringify(stored));
}

export async function loadProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const s = JSON.parse(raw) as StoredProfile;

    return {
      admissionBasis: s.admissionBasis,
      degreeIsStem: s.degreeIsStem,
      programStartDate: new Date(s.programStartDate),
      programEndDate: new Date(s.programEndDate),
      lastI20SignatureDate: s.lastI20SignatureDate
        ? new Date(s.lastI20SignatureDate)
        : undefined,
      opt: s.opt
        ? {
            startDate: new Date(s.opt.startDate),
            endDate: new Date(s.opt.endDate),
          }
        : undefined,
      employmentPeriods: [],
      cptPeriods: [],
    };
  } catch {
    return null;
  }
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
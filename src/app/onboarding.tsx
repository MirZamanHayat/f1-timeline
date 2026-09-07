import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveProfile } from '@/lib/storage';
import type { AdmissionBasis, Profile } from '@/rules/f1';

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  ink: '#111827',
  ink3: '#9CA3AF',
  line: '#E7E5E4',
  accent: '#1C4E80',
  accentSoft: '#EEF3F8',
};

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Step = 0 | 1 | 2 | 3;

function Choice({
  label,
  sub,
  on,
  onPress,
}: {
  label: string;
  sub: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.choice, on && s.choiceOn, pressed && { opacity: 0.9 }]}
    >
      <View style={s.choiceBody}>
        <Text style={[s.choiceLabel, on && { color: C.accent }]}>{label}</Text>
        <Text style={s.choiceSub}>{sub}</Text>
      </View>
      <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
    </Pressable>
  );
}

export default function Onboarding({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);

  const [basis, setBasis] = useState<AdmissionBasis | null>(null);
  const [isStem, setIsStem] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState(new Date(2026, 0, 20));
  const [endDate, setEndDate] = useState(new Date(2027, 11, 20));
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);

  const canAdvance =
    (step === 0 && basis !== null) ||
    (step === 1 && isStem !== null) ||
    step === 2 ||
    step === 3;

  async function finish() {
    if (saving) return;
    setSaving(true);
    console.log('[onboarding] finish called');

    try {
      const profile: Profile = {
        admissionBasis: basis ?? 'transition',
        degreeIsStem: isStem ?? false,
        programStartDate: startDate,
        programEndDate: endDate,
        employmentPeriods: [],
        cptPeriods: [],
      };

      await saveProfile(profile);
      console.log('[onboarding] saved, calling onDone');

      if (onDone) {
        onDone();
      } else {
        router.replace('/');
      }
    } catch (err) {
      console.log('[onboarding] save failed:', err);
      setSaving(false);
    }
  }

  function next() {
    if (step === 3) {
      void finish();
      return;
    }
    setStep((step + 1) as Step);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.progressBar}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.pip, i <= step && s.pipOn]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={s.q}>Were you in the US on September 15, 2026?</Text>
            <Text style={s.help}>
              DHS replaced duration of status with a fixed admission period on that
              date. Students already here kept a longer departure window.
            </Text>

            <Choice
              label="Yes, I was already here"
              sub="60-day departure period"
              on={basis === 'transition'}
              onPress={() => setBasis('transition')}
            />
            <Choice
              label="No, I arrived or re-entered after"
              sub="30-day departure period"
              on={basis === 'fixed'}
              onPress={() => setBasis('fixed')}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={s.q}>Is your degree STEM-designated?</Text>
            <Text style={s.help}>
              STEM degrees qualify for a 24-month OPT extension. Check your I-20 —
              the CIP code determines it, not the degree name.
            </Text>

            <Choice
              label="Yes"
              sub="Eligible for the 24-month STEM extension"
              on={isStem === true}
              onPress={() => setIsStem(true)}
            />
            <Choice
              label="No"
              sub="Standard 12-month OPT only"
              on={isStem === false}
              onPress={() => setIsStem(false)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.q}>Program start date</Text>
            <Text style={s.help}>The start date listed on your Form I-20.</Text>

            <Pressable
              style={s.dateField}
              onPress={() => setPicker(picker === 'start' ? null : 'start')}
            >
              <Text style={s.dateValue}>{fmt(startDate)}</Text>
              <Text style={s.dateHint}>tap to change</Text>
            </Pressable>

            {picker === 'start' && (
              <View style={s.pickerWrap}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  themeVariant="light"
                  textColor="#111827"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, d) => {
                    if (d) setStartDate(d);
                    if (Platform.OS === 'android') setPicker(null);
                  }}
                />
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.q}>Program end date</Text>
            <Text style={s.help}>
              This one drives almost everything — your departure period, your OPT
              filing window, your STEM deadline.
            </Text>

            <Pressable
              style={s.dateField}
              onPress={() => setPicker(picker === 'end' ? null : 'end')}
            >
              <Text style={s.dateValue}>{fmt(endDate)}</Text>
              <Text style={s.dateHint}>tap to change</Text>
            </Pressable>

            {picker === 'end' && (
              <View style={s.pickerWrap}>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  themeVariant="light"
                  textColor="#111827"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, d) => {
                    if (d) setEndDate(d);
                    if (Platform.OS === 'android') setPicker(null);
                  }}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          disabled={!canAdvance || saving}
          onPress={next}
          style={({ pressed }) => [
            s.cta,
            (!canAdvance || saving) && s.ctaOff,
            pressed && canAdvance && !saving && { opacity: 0.85 },
          ]}
        >
          <Text style={s.ctaText}>
            {saving ? 'Saving…' : step === 3 ? 'Build my timeline' : 'Continue'}
          </Text>
        </Pressable>

        {step > 0 && !saving && (
          <Pressable onPress={() => setStep((step - 1) as Step)}>
            <Text style={s.back}>Back</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  progressBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 12 },
  pip: { flex: 1, height: 3, borderRadius: 2, backgroundColor: C.line },
  pipOn: { backgroundColor: C.accent },

  scroll: { padding: 20, paddingTop: 32, gap: 12 },
  q: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, lineHeight: 32 },
  help: { fontSize: 14, color: C.ink3, lineHeight: 20, marginBottom: 12 },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    padding: 16,
  },
  choiceOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  choiceBody: { flex: 1, gap: 3 },
  choiceLabel: { fontSize: 16, fontWeight: '600', color: C.ink },
  choiceSub: { fontSize: 13, color: C.ink3 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },

  dateField: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    padding: 18,
    gap: 4,
  },
  dateValue: { fontSize: 22, fontWeight: '600', color: C.ink },
  dateHint: { fontSize: 12, color: C.ink3 },
  pickerWrap: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 8,
    marginTop: 8,
  },

  footer: { padding: 20, gap: 14, alignItems: 'center' },
  cta: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  ctaOff: { backgroundColor: '#D1D5DB' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  back: { fontSize: 15, color: C.ink3, fontWeight: '500' },
});
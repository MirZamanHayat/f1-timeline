import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadProfile, saveProfile } from '@/lib/storage';
import {
    optEmploymentPeriod,
    type Profile,
} from '@/rules/f1';

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  ink: '#111827',
  ink2: '#4B5563',
  ink3: '#9CA3AF',
  line: '#E7E5E4',
  accent: '#1C4E80',
  accentSoft: '#EEF3F8',
  danger: '#B42318',
};

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type PickerTarget =
  | { kind: 'signature' }
  | { kind: 'optStart' }
  | { kind: 'jobStart'; index: number }
  | { kind: 'jobEnd'; index: number }
  | { kind: 'cptStart'; index: number }
  | { kind: 'cptEnd'; index: number }
  | null;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<PickerTarget>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadProfile()
        .then((p) => {
          if (!alive) return;
          setProfile(p);
          setLoading(false);
        })
        .catch(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [])
  );

  function update(next: Profile) {
    setProfile(next);
    void saveProfile(next);
  }

  function pickerValue(): Date {
    if (!profile || !picker) return new Date();
    switch (picker.kind) {
      case 'signature':
        return profile.lastI20SignatureDate ?? new Date();
      case 'optStart':
        return profile.opt?.startDate ?? new Date();
      case 'jobStart':
        return profile.employmentPeriods[picker.index].start;
      case 'jobEnd':
        return profile.employmentPeriods[picker.index].end ?? new Date();
      case 'cptStart':
        return profile.cptPeriods[picker.index].start;
      case 'cptEnd':
        return profile.cptPeriods[picker.index].end;
    }
  }

  function onPick(d: Date) {
    if (!profile || !picker) return;

    if (picker.kind === 'signature') {
      update({ ...profile, lastI20SignatureDate: d });
      return;
    }

    if (picker.kind === 'optStart') {
      const period = optEmploymentPeriod(d);
      update({ ...profile, opt: { startDate: period.starts, endDate: period.ends } });
      return;
    }

    if (picker.kind === 'jobStart' || picker.kind === 'jobEnd') {
      const jobs = [...profile.employmentPeriods];
      const job = { ...jobs[picker.index] };
      if (picker.kind === 'jobStart') job.start = d;
      else job.end = d;
      jobs[picker.index] = job;
      update({ ...profile, employmentPeriods: jobs });
      return;
    }

    const cpt = [...profile.cptPeriods];
    const item = { ...cpt[picker.index] };
    if (picker.kind === 'cptStart') item.start = d;
    else item.end = d;
    cpt[picker.index] = item;
    update({ ...profile, cptPeriods: cpt });
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={s.empty}>Set up your timeline on the Home tab first.</Text>
      </SafeAreaView>
    );
  }

  const p = profile;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>YOUR RECORD</Text>
        <Text style={s.title}>Profile</Text>
        <Text style={s.intro}>
          Add these as they become real. Each one adds deadlines to your timeline.
        </Text>

        {/* I-20 signature */}
        <Text style={s.section}>I-20 travel signature</Text>
        <View style={s.card}>
          <Pressable
            style={s.field}
            onPress={() => setPicker(picker?.kind === 'signature' ? null : { kind: 'signature' })}
          >
            <Text style={s.fieldLabel}>Date last signed</Text>
            <Text style={s.fieldValue}>
              {p.lastI20SignatureDate ? fmt(p.lastI20SignatureDate) : 'Not set'}
            </Text>
          </Pressable>
          {p.lastI20SignatureDate && (
            <Pressable
              style={s.remove}
              onPress={() => update({ ...p, lastI20SignatureDate: undefined })}
            >
              <Text style={s.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>

        {/* OPT */}
        <Text style={s.section}>Post-completion OPT</Text>
        <View style={s.card}>
          {p.opt ? (
            <>
              <Pressable
                style={s.field}
                onPress={() => setPicker(picker?.kind === 'optStart' ? null : { kind: 'optStart' })}
              >
                <Text style={s.fieldLabel}>EAD start date</Text>
                <Text style={s.fieldValue}>{fmt(p.opt.startDate)}</Text>
              </Pressable>
              <View style={s.divider} />
              <View style={s.field}>
                <Text style={s.fieldLabel}>EAD end date</Text>
                <Text style={s.fieldValueMuted}>{fmt(p.opt.endDate)} · calculated</Text>
              </View>
              <Pressable style={s.remove} onPress={() => update({ ...p, opt: undefined })}>
                <Text style={s.removeText}>Remove OPT</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={s.add}
              onPress={() => {
                const period = optEmploymentPeriod(new Date());
                update({ ...p, opt: { startDate: period.starts, endDate: period.ends } });
              }}
            >
              <Text style={s.addText}>+ Add OPT dates</Text>
            </Pressable>
          )}
        </View>

        {/* Employment */}
        <Text style={s.section}>Employment</Text>
        <Text style={s.sectionHelp}>
          Used to count unemployment days against your 90-day limit.
        </Text>
        <View style={s.card}>
          {p.employmentPeriods.map((job, i) => (
            <View key={i}>
              {i > 0 && <View style={s.divider} />}
              <Pressable
                style={s.field}
                onPress={() =>
                  setPicker(
                    picker?.kind === 'jobStart' && picker.index === i
                      ? null
                      : { kind: 'jobStart', index: i }
                  )
                }
              >
                <Text style={s.fieldLabel}>Job {i + 1} start</Text>
                <Text style={s.fieldValue}>{fmt(job.start)}</Text>
              </Pressable>
              <Pressable
                style={s.field}
                onPress={() =>
                  setPicker(
                    picker?.kind === 'jobEnd' && picker.index === i
                      ? null
                      : { kind: 'jobEnd', index: i }
                  )
                }
              >
                <Text style={s.fieldLabel}>Job {i + 1} end</Text>
                <Text style={s.fieldValue}>{job.end ? fmt(job.end) : 'Still employed'}</Text>
              </Pressable>
              <Pressable
                style={s.remove}
                onPress={() =>
                  update({
                    ...p,
                    employmentPeriods: p.employmentPeriods.filter((_, x) => x !== i),
                  })
                }
              >
                <Text style={s.removeText}>Remove job {i + 1}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={s.add}
            onPress={() =>
              update({
                ...p,
                employmentPeriods: [...p.employmentPeriods, { start: new Date() }],
              })
            }
          >
            <Text style={s.addText}>+ Add employment period</Text>
          </Pressable>
        </View>

        {/* CPT */}
        <Text style={s.section}>CPT</Text>
        <Text style={s.sectionHelp}>
          12+ months of full-time CPT eliminates OPT eligibility. Part-time never does.
        </Text>
        <View style={s.card}>
          {p.cptPeriods.map((c, i) => (
            <View key={i}>
              {i > 0 && <View style={s.divider} />}
              <Pressable
                style={s.field}
                onPress={() =>
                  setPicker(
                    picker?.kind === 'cptStart' && picker.index === i
                      ? null
                      : { kind: 'cptStart', index: i }
                  )
                }
              >
                <Text style={s.fieldLabel}>CPT {i + 1} start</Text>
                <Text style={s.fieldValue}>{fmt(c.start)}</Text>
              </Pressable>
              <Pressable
                style={s.field}
                onPress={() =>
                  setPicker(
                    picker?.kind === 'cptEnd' && picker.index === i
                      ? null
                      : { kind: 'cptEnd', index: i }
                  )
                }
              >
                <Text style={s.fieldLabel}>CPT {i + 1} end</Text>
                <Text style={s.fieldValue}>{fmt(c.end)}</Text>
              </Pressable>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Full-time</Text>
                <Switch
                  value={c.fullTime}
                  onValueChange={(v) => {
                    const cpt = [...p.cptPeriods];
                    cpt[i] = { ...cpt[i], fullTime: v };
                    update({ ...p, cptPeriods: cpt });
                  }}
                />
              </View>
              <Pressable
                style={s.remove}
                onPress={() =>
                  update({ ...p, cptPeriods: p.cptPeriods.filter((_, x) => x !== i) })
                }
              >
                <Text style={s.removeText}>Remove CPT {i + 1}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={s.add}
            onPress={() =>
              update({
                ...p,
                cptPeriods: [
                  ...p.cptPeriods,
                  { start: new Date(), end: new Date(), fullTime: false },
                ],
              })
            }
          >
            <Text style={s.addText}>+ Add CPT period</Text>
          </Pressable>
        </View>

        {picker && (
          <View style={s.pickerWrap}>
            <DateTimePicker
              value={pickerValue()}
              mode="date"
              themeVariant="light"
              textColor="#111827"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                if (d) onPick(d);
                if (Platform.OS === 'android') setPicker(null);
              }}
            />
            <Pressable style={s.done} onPress={() => setPicker(null)}>
              <Text style={s.doneText}>Done</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { fontSize: 15, color: C.ink3, textAlign: 'center', lineHeight: 22 },
  scroll: { padding: 20 },

  eyebrow: { fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1.4 },
  title: { fontSize: 36, fontWeight: '700', color: C.ink, letterSpacing: -0.8, marginTop: 2 },
  intro: { fontSize: 14, color: C.ink3, lineHeight: 20, marginTop: 8 },

  section: {
    fontSize: 12,
    fontWeight: '700',
    color: C.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHelp: { fontSize: 13, color: C.ink3, marginBottom: 10, marginLeft: 4, lineHeight: 18 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  fieldLabel: { fontSize: 15, color: C.ink2 },
  fieldValue: { fontSize: 15, fontWeight: '600', color: C.ink },
  fieldValueMuted: { fontSize: 14, color: C.ink3 },
  divider: { height: 1, backgroundColor: C.line },

  add: { paddingVertical: 15, paddingHorizontal: 16 },
  addText: { fontSize: 15, fontWeight: '600', color: C.accent },
  remove: { paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.line },
  removeText: { fontSize: 14, color: C.danger, fontWeight: '500' },

  pickerWrap: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 8,
    marginTop: 16,
  },
  done: { alignItems: 'center', paddingVertical: 12 },
  doneText: { fontSize: 16, fontWeight: '600', color: C.accent },
});
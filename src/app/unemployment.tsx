import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadProfile } from '@/lib/storage';
import {
    OPT_UNEMPLOYMENT_CAP_DAYS,
    daysUntil,
    unemploymentDaysRemaining,
    unemploymentDaysUsed,
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
  ok: '#067647',
  warn: '#B54708',
  danger: '#B42318',
};

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UnemploymentScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadProfile()
        .then((p) => {
          if (!alive) return;
          setProfile(p);
          setLoading(false);
        })
        .catch(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!profile?.opt) {
    return (
      <SafeAreaView style={[s.safe, s.center]} edges={['top']}>
        <Text style={s.emptyTitle}>Not on OPT yet</Text>
        <Text style={s.emptyBody}>
          Unemployment days only count once your post-completion OPT begins. Add your
          EAD start date on the Profile tab and this will start tracking.
        </Text>
      </SafeAreaView>
    );
  }

  const p = profile;
  const opt = p.opt!;
  const started = today >= opt.startDate;
  const asOf = today > opt.endDate ? opt.endDate : today;

  const cap = OPT_UNEMPLOYMENT_CAP_DAYS;
  const used = started ? unemploymentDaysUsed(opt.startDate, p.employmentPeriods, asOf) : 0;
  const left = started
    ? unemploymentDaysRemaining(opt.startDate, p.employmentPeriods, asOf, false)
    : cap;

  const pct = Math.max(0, Math.min(1, used / cap));
  const tone = left <= 15 ? C.danger : left <= 45 ? C.warn : C.ok;

  const currentJob = p.employmentPeriods.find((j) => !j.end);
  const employed = Boolean(currentJob);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>OPT COMPLIANCE</Text>
        <Text style={s.title}>Unemployment</Text>

        <View style={s.hero}>
          <Text style={s.heroKicker}>DAYS REMAINING</Text>
          <View style={s.heroCount}>
            <Text style={[s.heroNum, { color: tone }]}>{left}</Text>
            <Text style={s.heroDenom}>of {cap}</Text>
          </View>

          <View style={s.track}>
            <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: tone }]} />
          </View>

          <Text style={s.heroMeta}>
            {used} {used === 1 ? 'day' : 'days'} used since {fmt(opt.startDate)}
          </Text>
        </View>

        <View style={[s.statusCard, { borderColor: employed ? C.ok : C.warn }]}>
          <View style={[s.statusDot, { backgroundColor: employed ? C.ok : C.warn }]} />
          <View style={s.statusBody}>
            <Text style={s.statusLabel}>
              {employed ? 'Currently employed' : 'Currently unemployed'}
            </Text>
            <Text style={s.statusMeta}>
              {employed
                ? `Since ${fmt(currentJob!.start)} — the counter is paused.`
                : 'Every day counts against your limit.'}
            </Text>
          </View>
        </View>

        <Text style={s.section}>The rule</Text>
        <View style={s.card}>
          <Text style={s.ruleText}>
            You may accrue up to {cap} days of unemployment during post-completion OPT.
            The days are cumulative, not consecutive — gaps between jobs add up across
            the whole authorization period. Exceeding the limit means falling out of
            status.
          </Text>
          <Text style={s.ruleText}>
            A STEM extension raises the cumulative cap to 150 days total, not 150
            additional days.
          </Text>
        </View>

        <Text style={s.section}>Your employment</Text>
        <View style={s.card}>
          {p.employmentPeriods.length === 0 ? (
            <Text style={s.ruleText}>
              No employment logged. Add periods on the Profile tab to track this
              accurately.
            </Text>
          ) : (
            p.employmentPeriods.map((job, i) => (
              <View key={i} style={s.jobRow}>
                <View>
                  <Text style={s.jobLabel}>Job {i + 1}</Text>
                  <Text style={s.jobMeta}>
                    {fmt(job.start)} — {job.end ? fmt(job.end) : 'present'}
                  </Text>
                </View>
                <Text style={s.jobDays}>
                  {job.end
                    ? `${daysUntil(job.end, job.start) + 1}d`
                    : `${daysUntil(today, job.start) + 1}d`}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={s.disclaimer}>
          Informational only. Not legal advice. USCIS and your DSO determine your
          actual unemployment count — confirm with them.
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { padding: 20 },

  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: C.ink3, textAlign: 'center', lineHeight: 22 },

  eyebrow: { fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1.4 },
  title: { fontSize: 36, fontWeight: '700', color: C.ink, letterSpacing: -0.8, marginTop: 2 },

  hero: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    padding: 22,
    marginTop: 20,
    gap: 12,
  },
  heroKicker: { fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1.2 },
  heroCount: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  heroNum: { fontSize: 72, fontWeight: '300', letterSpacing: -3, lineHeight: 76 },
  heroDenom: { fontSize: 20, color: C.ink3, fontWeight: '500' },
  track: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  heroMeta: { fontSize: 14, color: C.ink3 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBody: { flex: 1, gap: 3 },
  statusLabel: { fontSize: 16, fontWeight: '600', color: C.ink },
  statusMeta: { fontSize: 13, color: C.ink3, lineHeight: 18 },

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
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 12,
  },
  ruleText: { fontSize: 14, color: C.ink2, lineHeight: 21 },

  jobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobLabel: { fontSize: 15, fontWeight: '600', color: C.ink },
  jobMeta: { fontSize: 13, color: C.ink3, marginTop: 2 },
  jobDays: { fontSize: 15, fontWeight: '600', color: C.ink2 },

  disclaimer: { fontSize: 12, color: C.ink3, lineHeight: 18, marginTop: 24, textAlign: 'center' },
});
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadProfile } from '@/lib/storage';
import {
  computeDeadlines,
  daysUntil,
  nextDeadline,
  type Deadline,
  type Profile,
  type Severity,
} from '@/rules/f1';
import Onboarding from './onboarding';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  ink: '#111827',
  ink2: '#4B5563',
  ink3: '#9CA3AF',
  line: '#E7E5E4',
  accent: '#1C4E80',
  accentSoft: '#EEF3F8',
  critical: '#B42318',
  act: '#B54708',
  info: '#6B7280',
};

const TONE: Record<Severity, { color: string; label: string; soft: string }> = {
  critical: { color: C.critical, label: 'Critical', soft: '#FEF3F2' },
  act: { color: C.act, label: 'Action needed', soft: '#FFFAEB' },
  info: { color: C.info, label: 'Reference', soft: '#F9FAFB' },
};

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Row({
  d,
  today,
  open,
  onPress,
  dim,
}: {
  d: Deadline;
  today: Date;
  open: boolean;
  onPress: () => void;
  dim?: boolean;
}) {
  const days = daysUntil(d.date, today);
  const tone = TONE[d.severity];

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [st.row, pressed && st.rowPressed, dim && st.rowDim]}
      >
        <View style={st.rail}>
          <View style={[st.node, { borderColor: dim ? C.line : tone.color }]} />
        </View>

        <View style={st.rowBody}>
          <Text style={[st.rowLabel, dim && st.strike]} numberOfLines={2}>
            {d.label}
          </Text>
          <Text style={st.rowDate}>{fmt(d.date)}</Text>
        </View>

        {dim ? (
          <Text style={st.rowPast}>past</Text>
        ) : (
          <View style={st.rowRight}>
            <Text style={st.rowDays}>{days}</Text>
            <Text style={st.rowDaysUnit}>days</Text>
          </View>
        )}
      </Pressable>

      {open && (
        <View style={st.detail}>
          <View style={[st.badge, { backgroundColor: tone.soft }]}>
            <Text style={[st.badgeText, { color: tone.color }]}>{tone.label}</Text>
          </View>
          <Text style={st.detailText}>{d.detail}</Text>
          <Pressable
            onPress={() => Linking.openURL(d.sourceUrl)}
            style={({ pressed }) => pressed && { opacity: 0.5 }}
          >
            <Text style={st.link}>Read the regulation ↗</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const today = new Date();

  const [openId, setOpenId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    loadProfile()
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(openId === id ? null : id);
  }

  if (loading) {
    return (
      <SafeAreaView style={[st.safe, st.center]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!profile || editing) {
    return (
      <Onboarding
        onDone={() => {
          setEditing(false);
          refresh();
        }}
      />
    );
  }

  const deadlines = computeDeadlines(profile);
  const next = nextDeadline(deadlines, today);
  const upcoming = deadlines.filter((d) => d.date >= today);
  const passed = deadlines.filter((d) => d.date < today);

  const span = daysUntil(profile.programEndDate, profile.programStartDate);
  const elapsed = daysUntil(today, profile.programStartDate);
  const pct = span > 0 ? Math.max(0, Math.min(1, elapsed / span)) : 0;

  const criticalCount = upcoming.filter((d) => d.severity === 'critical').length;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <View style={st.headerRow}>
            <View>
              <Text style={st.eyebrow}>F-1 STATUS</Text>
              <Text style={st.title}>Timeline</Text>
            </View>
            <Pressable
              onPress={() => setEditing(true)}
              style={({ pressed }) => [st.editBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={st.editText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {next && (
          <View style={st.hero}>
            <View style={st.heroTop}>
              <Text style={st.heroKicker}>NEXT DEADLINE</Text>
              <View style={[st.badge, { backgroundColor: TONE[next.severity].soft }]}>
                <Text style={[st.badgeText, { color: TONE[next.severity].color }]}>
                  {TONE[next.severity].label}
                </Text>
              </View>
            </View>

            <View style={st.heroCount}>
              <Text style={st.heroNum}>{daysUntil(next.date, today)}</Text>
              <Text style={st.heroUnit}>days</Text>
            </View>

            <Text style={st.heroLabel}>{next.label}</Text>
            <Text style={st.heroDate}>{fmt(next.date)}</Text>
          </View>
        )}

        <View style={st.stats}>
          <View style={st.stat}>
            <Text style={st.statNum}>{upcoming.length}</Text>
            <Text style={st.statLabel}>upcoming</Text>
          </View>
          <View style={st.statDiv} />
          <View style={st.stat}>
            <Text style={[st.statNum, { color: C.critical }]}>{criticalCount}</Text>
            <Text style={st.statLabel}>critical</Text>
          </View>
          <View style={st.statDiv} />
          <View style={st.stat}>
            <Text style={st.statNum}>{Math.round(pct * 100)}%</Text>
            <Text style={st.statLabel}>program done</Text>
          </View>
        </View>

        <View style={st.progressCard}>
          <View style={st.progressHead}>
            <Text style={st.progressLabel}>Program</Text>
            <Text style={st.progressMeta}>
              {fmt(profile.programStartDate)} — {fmt(profile.programEndDate)}
            </Text>
          </View>
          <View style={st.track}>
            <View style={[st.fill, { width: `${pct * 100}%` }]} />
          </View>
        </View>

        <Text style={st.section}>Upcoming</Text>
        <View style={st.group}>
          {upcoming.map((d, i) => (
            <View key={d.id}>
              {i > 0 && <View style={st.sep} />}
              <Row d={d} today={today} open={openId === d.id} onPress={() => toggle(d.id)} />
            </View>
          ))}
        </View>

        {passed.length > 0 && (
          <>
            <Text style={st.section}>Passed</Text>
            <View style={st.group}>
              {passed.map((d, i) => (
                <View key={d.id}>
                  {i > 0 && <View style={st.sep} />}
                  <Row d={d} today={today} open={false} onPress={() => {}} dim />
                </View>
              ))}
            </View>
          </>
        )}

        <View style={st.footer}>
          <Text style={st.disclaimer}>
            Informational only. Not legal advice. Dates are calculated from the
            information you provide — confirm each one with your DSO.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 64 },

  header: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1.4 },
  title: { fontSize: 36, fontWeight: '700', color: C.ink, letterSpacing: -0.8, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.accentSoft,
    marginBottom: 6,
  },
  editText: { fontSize: 14, fontWeight: '600', color: C.accent },

  hero: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: C.line,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1.2 },
  heroCount: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  heroNum: { fontSize: 68, fontWeight: '300', color: C.ink, letterSpacing: -3, lineHeight: 72 },
  heroUnit: { fontSize: 17, color: C.ink3, fontWeight: '500' },
  heroLabel: { fontSize: 18, fontWeight: '600', color: C.ink, marginTop: 10 },
  heroDate: { fontSize: 14, color: C.ink3, marginTop: 3 },

  stats: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 12,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDiv: { width: 1, backgroundColor: C.line, marginVertical: 4 },
  statNum: { fontSize: 22, fontWeight: '600', color: C.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.ink3, letterSpacing: 0.3 },

  progressCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 14, fontWeight: '600', color: C.ink },
  progressMeta: { fontSize: 12, color: C.ink3 },
  track: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },

  section: {
    fontSize: 12,
    fontWeight: '700',
    color: C.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 30,
    marginBottom: 10,
    marginLeft: 4,
  },
  group: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  sep: { height: 1, backgroundColor: C.line, marginLeft: 48 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  rowPressed: { backgroundColor: '#F9FAFB' },
  rowDim: { opacity: 0.5 },
  rail: { width: 32, alignItems: 'center' },
  node: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, backgroundColor: C.surface },
  rowBody: { flex: 1, gap: 3 },
  rowLabel: { fontSize: 16, fontWeight: '500', color: C.ink, letterSpacing: -0.2 },
  rowDate: { fontSize: 13, color: C.ink3 },
  strike: { textDecorationLine: 'line-through' },
  rowRight: { alignItems: 'flex-end' },
  rowDays: { fontSize: 18, fontWeight: '600', color: C.ink2, letterSpacing: -0.4 },
  rowDaysUnit: { fontSize: 11, color: C.ink3, marginTop: -2 },
  rowPast: { fontSize: 12, color: C.ink3 },

  detail: { paddingLeft: 48, paddingRight: 16, paddingBottom: 18, gap: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  detailText: { fontSize: 14, color: C.ink2, lineHeight: 21 },
  link: { fontSize: 14, fontWeight: '600', color: C.accent },

  footer: { marginTop: 32, paddingHorizontal: 8 },
  disclaimer: { fontSize: 12, color: C.ink3, lineHeight: 18, textAlign: 'center' },
});
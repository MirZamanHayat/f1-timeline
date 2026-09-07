import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computeDeadlines, daysUntil, type Profile } from '@/rules/f1';

// Hardcoded for now. Replaced by real onboarding later.
const DEMO_PROFILE: Profile = {
  admissionBasis: 'transition',
  programStartDate: new Date(2026, 0, 20),
  programEndDate: new Date(2027, 11, 20),
  degreeIsStem: true,
  lastI20SignatureDate: new Date(2026, 7, 1),
  employmentPeriods: [],
  cptPeriods: [],
};

export default function HomeScreen() {
  const today = new Date();
  const deadlines = computeDeadlines(DEMO_PROFILE);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Your timeline</Text>

        {deadlines.map((d) => {
          const days = daysUntil(d.date, today);
          return (
            <View key={d.id} style={styles.card}>
              <Text style={styles.label}>{d.label}</Text>
              <Text style={styles.date}>{d.date.toDateString()}</Text>
              <Text style={styles.days}>
                {days < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`}
              </Text>
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          Informational only. Not legal advice. Confirm all dates with your DSO.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, gap: 12 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 8, color: '#111' },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 4,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#111' },
  date: { fontSize: 14, color: '#555' },
  days: { fontSize: 14, fontWeight: '500', color: '#111' },
  disclaimer: { fontSize: 12, color: '#666', marginTop: 16, lineHeight: 18 },
});
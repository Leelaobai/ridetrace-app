import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface StatItem {
  label: string;
  value: string;
}

interface Props {
  items: StatItem[];
}

export function StatsGrid({ items }: Props) {
  // 补齐为偶数行（2列）
  const padded = items.length % 2 === 0 ? items : [...items, { label: '', value: '' }];

  return (
    <View style={styles.grid}>
      {padded.map((item, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            i % 2 === 0 ? styles.cellLeft : styles.cellRight,
            i < padded.length - 2 ? styles.cellBorderBottom : null,
          ]}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 5,
    backgroundColor: Colors.glassBg,
  },
  cellLeft: { borderRightWidth: 1, borderRightColor: Colors.glassBorder },
  cellRight: {},
  cellBorderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  label: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: Colors.textMuted },
  value: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: Colors.textPrimary },
});

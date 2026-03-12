import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: '页面不存在' }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.message}>页面不存在</Text>
        <Link href="/" style={styles.link}>返回首页</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
    gap: 12,
  },
  code: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.primary,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  link: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
  },
});

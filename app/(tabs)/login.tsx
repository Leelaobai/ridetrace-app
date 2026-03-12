import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { login, sendOTP, verifyOTP } from '../../services/authService';
import { getMyVehicle } from '../../services/vehicleService';
import { isValidEmail } from '../../utils/validation';
import { getErrorMessage } from '../../utils/errors';

type Tab = 'password' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { setAuth, setVehicle } = useAuthStore();

  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      return;
    }
    if (!isValidEmail(email)) {
      setError('请输入正确的邮箱格式');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      setAuth(res.token, res.user, res.has_vehicle);
      if (res.has_vehicle) {
        try { const v = await getMyVehicle(); setVehicle(v.id, v.nickname, v.total_distance_m); } catch {}
        router.replace('/(tabs)/cockpit');
      } else {
        router.replace('/vehicle/manage');
      }
    } catch (e) {
      setError(getErrorMessage(e, '登录失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      setError('请输入正确的邮箱格式');
      return;
    }
    setError('');
    try {
      await sendOTP(email.trim());
      setCountdown(300);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleOTPLogin = async () => {
    if (!isValidEmail(email)) {
      setError('请输入正确的邮箱格式');
      return;
    }
    if (otp.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await verifyOTP(email.trim(), otp);
      setAuth(res.token, res.user, res.has_vehicle);
      if (res.has_vehicle) {
        try { const v = await getMyVehicle(); setVehicle(v.id, v.nickname, v.total_distance_m); } catch {}
        router.replace('/(tabs)/cockpit');
      } else {
        router.replace('/vehicle/manage');
      }
    } catch (e) {
      setError(getErrorMessage(e, '验证失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = () => {
    Alert.alert('即将上线', '第三方登录敬请期待');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.glowDot} />
          <Text style={styles.appName}>RideTrace</Text>
          <Text style={styles.tagline}>记录每一段骑行</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12.4k</Text>
              <Text style={styles.statLabel}>活跃骑手</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>PRO</Text>
              <Text style={styles.statLabel}>认证级别</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0.24</Text>
              <Text style={styles.statLabel}>平均风阻</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'password' && styles.tabBtnActive]}
              onPress={() => { setTab('password'); setError(''); }}
            >
              <Text style={[styles.tabText, tab === 'password' && styles.tabTextActive]}>
                密码登录
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'otp' && styles.tabBtnActive]}
              onPress={() => { setTab('otp'); setError(''); }}
            >
              <Text style={[styles.tabText, tab === 'otp' && styles.tabTextActive]}>
                验证码登录
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="邮箱"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {tab === 'password' && (
              <>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="密码"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>登录</Text>
                      <Ionicons name="arrow-forward" size={18} color="#000" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSocialLogin}>
                  <Text style={styles.forgotText}>忘记密码？</Text>
                </TouchableOpacity>
              </>
            )}

            {tab === 'otp' && (
              <>
                <View style={styles.otpRow}>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Ionicons name="key-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="6 位验证码"
                      placeholderTextColor={Colors.textMuted}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.sendOtpBtn, (countdown > 0 || loading) && styles.sendOtpBtnDisabled]}
                    onPress={handleSendOTP}
                    disabled={countdown > 0}
                  >
                    <Text style={styles.sendOtpText}>
                      {countdown > 0 ? `重新发送(${countdown}s)` : '发送验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleOTPLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>登录 / 注册</Text>
                      <Ionicons name="arrow-forward" size={18} color="#000" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或者</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={handleSocialLogin}>
              <Ionicons name="logo-apple" size={20} color={Colors.textPrimary} />
              <Text style={styles.socialBtnText}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={handleSocialLogin}>
              <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  glowDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 32,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  statLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.glassBorder,
  },
  card: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    padding: 24,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  tabBtn: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeBtn: { padding: 4 },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendOtpBtn: {
    paddingHorizontal: 14,
    height: 52,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  sendOtpBtnDisabled: {
    opacity: 0.5,
  },
  sendOtpText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    color: '#000',
  },
  errorText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    gap: 8,
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: '#000',
  },
  forgotText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.glassBorder,
  },
  dividerText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  socialBtnText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
});

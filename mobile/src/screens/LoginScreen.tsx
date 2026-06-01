import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';

/**
 * LoginScreen — 登录页
 *
 * 手机号 + 验证码登录/注册。
 * 首次登录自动跳转注册流程（残障画像设置）。
 */

const LoginScreen: React.FC = () => {
  const {colors, fontSize, fontWeight, borderRadius, spacing} = useTheme();
  const {login, register, sendCode} = useAuthStore();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    try {
      await sendCode(phone);
      setCountdown(60);
      Alert.alert('验证码已发送', '开发环境验证码为 123456');
    } catch (err: any) {
      Alert.alert('发送失败', err.response?.data?.message || '请稍后重试');
    }
  };

  const handleSubmit = async () => {
    if (!phone || !code) {
      Alert.alert('提示', '请输入手机号和验证码');
      return;
    }
    setIsSubmitting(true);
    try {
      // 先尝试登录
      try {
        await login(phone, code);
        return; // 登录成功，authStore.isLoggedIn → true，导航自动切换
      } catch (loginErr: any) {
        // 如果是"未注册"，则走注册流程
        if (loginErr.response?.status === 404) {
          // 进入注册页面
          await handleRegister();
        } else {
          throw loginErr;
        }
      }
    } catch (err: any) {
      Alert.alert('登录失败', err.response?.data?.message || '请检查验证码');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    // 首次注册：用最小信息创建用户（残障画像在注册流程中完善）
    try {
      await register({
        phone,
        code,
        name: '',
        disability_type: 'physical',
      });
      // 注册成功，authStore 更新，导航自动跳转
      // 注意：此时用户需要进入注册流程设置残障画像
      // 实际流程中，这里会跳转到一个多步骤注册页
    } catch (err: any) {
      Alert.alert('注册失败', err.response?.data?.message || '请稍后重试');
    }
  };

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);
  const canSubmit = isPhoneValid && code.length >= 4 && !isSubmitting;

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.bg}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        {/* Logo 区 */}
        <View style={styles.logoArea}>
          <Text style={styles.logo}>♿</Text>
          <Text style={[styles.title, {color: colors.textPrimary, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold as any}]}>
            无障碍出行陪伴
          </Text>
          <Text style={[styles.subtitle, {color: colors.textTertiary, fontSize: fontSize.sm}]}>
            登录后开始使用 AI 导航和真人伴行服务
          </Text>
        </View>

        {/* 手机号输入 */}
        <View style={[styles.inputGroup, {marginBottom: spacing.md}]}>
          <Text style={[styles.label, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            手机号
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: phone ? colors.primary : colors.border,
              borderRadius: borderRadius.md,
              color: colors.textPrimary,
              fontSize: fontSize.base,
            }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="请输入手机号"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            maxLength={11}
            accessibilityLabel="手机号输入框"
          />
        </View>

        {/* 验证码输入 */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            验证码
          </Text>
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.codeInput, {
                backgroundColor: colors.surface,
                borderColor: code ? colors.primary : colors.border,
                borderRadius: borderRadius.md,
                color: colors.textPrimary,
                fontSize: fontSize.base,
              }]}
              value={code}
              onChangeText={setCode}
              placeholder="输入验证码"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              accessibilityLabel="验证码输入框"
            />
            <TouchableOpacity
              style={[styles.sendBtn, {
                backgroundColor: isPhoneValid && countdown === 0 ? colors.primary : colors.border,
                borderRadius: borderRadius.md,
              }]}
              onPress={handleSendCode}
              disabled={!isPhoneValid || countdown > 0}
              activeOpacity={0.7}>
              <Text style={[styles.sendBtnText, {
                color: isPhoneValid && countdown === 0 ? colors.textInverse : colors.textTertiary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium as any,
              }]}>
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 提示 */}
        <Text style={[styles.hint, {color: colors.textTertiary, fontSize: fontSize.xs}]}>
          未注册的手机号将自动创建账号 · 开发环境验证码：123456
        </Text>

        {/* 登录按钮 */}
        <TouchableOpacity
          style={[styles.submitBtn, {
            backgroundColor: canSubmit ? colors.primary : colors.border,
            borderRadius: borderRadius.full,
            opacity: canSubmit ? 1 : 0.5,
          }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}>
          <Text style={[styles.submitText, {color: colors.textInverse, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
            {isSubmitting ? '登录中...' : '登录 / 注册'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  sendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  sendBtnText: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 18,
  },
  submitBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    textAlign: 'center',
  },
});

export default LoginScreen;

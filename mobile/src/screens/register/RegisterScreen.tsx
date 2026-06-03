import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView} from 'react-native';
import {useTheme} from '../../theme';
import {useAuthStore} from '../../store/authStore';
import StepIdentity from './StepIdentity';
import StepDisabilityType from './StepDisabilityType';
import StepAssistiveDevice from './StepAssistiveDevice';
import StepPreferences from './StepPreferences';
import RegisterCompleteScreen from './RegisterCompleteScreen';

/**
 * RegisterScreen — 新用户注册流程
 *
 * 残障人士（4 步）：
 *   0. 身份确认 → 1. 残障类型 → 2. 辅具 → 3. 偏好 → 完成
 *
 * 非残障人士（1 步）：
 *   0. 身份确认 → 直接完成
 */

export interface RegisterFormData {
  identity_type: string;       // 'disabled' | 'non_disabled'
  disability_type: string;
  assistive_device: string;
  nav_preference: string;
  font_preference: string;
}

const RegisterScreen: React.FC<{navigation?: any; route?: any}> = ({navigation, route}) => {
  const {colors, fontSize, fontWeight, borderRadius, spacing} = useTheme();
  const {register, updateProfile} = useAuthStore();
  const phoneFromLogin = route?.params?.phone || '';
  const codeFromLogin = route?.params?.code || '';

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<RegisterFormData>({
    identity_type: 'disabled',
    disability_type: 'physical',
    assistive_device: '',
    nav_preference: 'barrier_free',
    font_preference: 'standard',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabledUser = formData.identity_type === 'disabled';

  const updateField = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  // ---- 步骤定义 ----
  // 残疾人：0→1→2→3→done (4步)
  // 非残疾人：0→done (1步，直接完成)
  const TOTAL_STEPS = 4; // 0-based: 0,1,2,3 = done

  const handleNext = async () => {
    if (!isDisabledUser) {
      // 非残障人士：直接提交完成
      if (step === 0) {
        await handleSubmit();
        return;
      }
    }

    if (isDisabledUser) {
      if (step < 3) {
        setStep(s => s + 1);
      } else if (step === 3) {
        await handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (phoneFromLogin && codeFromLogin) {
        await register({
          phone: phoneFromLogin,
          code: codeFromLogin,
          user_type: isDisabledUser ? 'disabled' : 'non_disabled',
          disability_type: isDisabledUser ? formData.disability_type : 'none',
          assistive_device: isDisabledUser ? formData.assistive_device : '',
          nav_preference: formData.nav_preference,
          font_preference: formData.font_preference,
        });
      } else {
        await updateProfile({
          user_type: isDisabledUser ? 'disabled' : 'non_disabled',
          disability_type: isDisabledUser ? formData.disability_type : 'none',
          assistive_device: isDisabledUser ? formData.assistive_device : '',
          nav_preference: formData.nav_preference,
          font_preference: formData.font_preference,
        });
      }
      setStep(TOTAL_STEPS);
    } catch (err: any) {
      const isWeb = typeof window !== 'undefined';
      const msg = err?.response?.data?.message || err?.response?.data?.error || '请稍后重试';
      if (isWeb) { window.alert('保存失败\n\n' + msg); }
      Alert.alert('保存失败', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (!isDisabledUser) {
      if (step === 3) setStep(0);
      return;
    }
    if (step > 0) setStep(s => s - 1);
  };

  // 显示用的步骤号和总数
  const stepLabel = () => {
    if (!isDisabledUser) return step === 0 ? 1 : 2;
    return step + 1;
  };
  const totalLabel = () => isDisabledUser ? 4 : 1;
  const progressPercent = Math.round((stepLabel() / totalLabel()) * 100);

  // ---- 完成页 ----
  if (step === TOTAL_STEPS) {
    return <RegisterCompleteScreen navigation={navigation} />;
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} disabled={step === 0} style={styles.backBtn}>
          <Text style={{color: step === 0 ? colors.textTertiary : colors.primary, fontSize: fontSize.lg}}>
            {step === 0 ? '' : '‹ 上一步'}
          </Text>
        </TouchableOpacity>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>
          {stepLabel()} / {totalLabel()}
        </Text>
      </View>

      <View style={[styles.progressBar, {backgroundColor: colors.border}]}>
        <View style={[styles.progressFill, {backgroundColor: colors.primary, width: `${progressPercent}%`}]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 步骤 0：身份 */}
        {step === 0 && (
          <StepIdentity
            value={formData.identity_type}
            onChange={v => {
              updateField('identity_type', v);
              updateField('disability_type', v === 'disabled' ? 'physical' : 'none');
            }}
          />
        )}

        {/* 步骤 1：残障类型（仅残障人士） */}
        {step === 1 && isDisabledUser && (
          <StepDisabilityType
            value={formData.disability_type}
            onChange={v => updateField('disability_type', v)}
          />
        )}

        {/* 步骤 2：辅具（仅残障人士） */}
        {step === 2 && isDisabledUser && (
          <StepAssistiveDevice
            value={formData.assistive_device}
            onChange={v => updateField('assistive_device', v)}
          />
        )}

        {/* 步骤 3：偏好（所有用户） */}
        {step === 3 && (
          <StepPreferences
            navPreference={formData.nav_preference}
            fontPreference={formData.font_preference}
            onNavChange={v => updateField('nav_preference', v)}
            onFontChange={v => updateField('font_preference', v)}
          />
        )}

        <View style={styles.bottomBtns}>
          <TouchableOpacity
            style={[styles.nextBtn, {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.full,
              opacity: isSubmitting ? 0.6 : 1,
            }]}
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.8}>
            <Text style={[styles.nextBtnText, {color: colors.textInverse, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
              {isSubmitting ? '保存中...' : step === 3 ? '完成设置' : '下一步'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: {paddingVertical: 4, paddingRight: 16},
  progressBar: {height: 3, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden'},
  progressFill: {height: '100%', borderRadius: 2},
  content: {flex: 1},
  contentInner: {padding: 16, paddingBottom: 32},
  bottomBtns: {marginTop: 32, paddingHorizontal: 16},
  nextBtn: {paddingVertical: 14, alignItems: 'center'},
  nextBtnText: {textAlign: 'center'},
});

export default RegisterScreen;

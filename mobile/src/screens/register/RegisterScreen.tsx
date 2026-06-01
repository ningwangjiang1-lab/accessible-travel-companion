import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView} from 'react-native';
import {useTheme} from '../../theme';
import {useAuthStore} from '../../store/authStore';
import StepDisabilityType from './StepDisabilityType';
import StepAssistiveDevice from './StepAssistiveDevice';
import StepPreferences from './StepPreferences';
import RegisterCompleteScreen from './RegisterCompleteScreen';

/**
 * RegisterScreen — 新用户注册流程（多步骤）
 *
 * 步骤：
 * 1. 选择残障类型（4 选 1 卡片式）
 * 2. 选择辅具使用（多选）
 * 3. 导航偏好 + 字体偏好
 * 4. 完成页 → 跳转首页
 */

export interface RegisterFormData {
  disability_type: string;
  assistive_device: string;
  nav_preference: string;
  font_preference: string;
}

const TOTAL_STEPS = 4;

const RegisterScreen: React.FC = () => {
  const {colors, fontSize, fontWeight, borderRadius, spacing} = useTheme();
  const {updateProfile, user} = useAuthStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    disability_type: 'physical',
    assistive_device: '',
    nav_preference: 'barrier_free',
    font_preference: 'standard',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else if (step === TOTAL_STEPS - 1) {
      // 最后一步：提交画像
      setIsSubmitting(true);
      try {
        await updateProfile(formData);
        setStep(TOTAL_STEPS); // → 完成页
      } catch (err: any) {
        Alert.alert('保存失败', err.response?.data?.message || '请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);

  // ---- 完成页 ----
  if (step === TOTAL_STEPS) {
    return <RegisterCompleteScreen />;
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      {/* 顶部进度条 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} disabled={step === 1} style={styles.backBtn}>
          <Text style={{color: step === 1 ? colors.textTertiary : colors.primary, fontSize: fontSize.lg}}>
            {step === 1 ? '' : '‹ 上一步'}
          </Text>
        </TouchableOpacity>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>
          {step} / {TOTAL_STEPS - 1}
        </Text>
      </View>

      {/* 进度条 */}
      <View style={[styles.progressBar, {backgroundColor: colors.border}]}>
        <View
          style={[styles.progressFill, {backgroundColor: colors.primary, width: `${progressPercent}%`}]}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 步骤 1：选择残障类型 */}
        {step === 1 && (
          <StepDisabilityType
            value={formData.disability_type}
            onChange={v => updateField('disability_type', v)}
          />
        )}

        {/* 步骤 2：选择辅具 */}
        {step === 2 && (
          <StepAssistiveDevice
            value={formData.assistive_device}
            onChange={v => updateField('assistive_device', v)}
          />
        )}

        {/* 步骤 3：偏好设置 */}
        {step === 3 && (
          <StepPreferences
            navPreference={formData.nav_preference}
            fontPreference={formData.font_preference}
            onNavChange={v => updateField('nav_preference', v)}
            onFontChange={v => updateField('font_preference', v)}
          />
        )}

        {/* 底部按钮 */}
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
              {step === TOTAL_STEPS - 1
                ? isSubmitting ? '保存中...' : '完成设置'
                : '下一步'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  progressBar: {
    height: 3,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  bottomBtns: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  nextBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    textAlign: 'center',
  },
});

export default RegisterScreen;

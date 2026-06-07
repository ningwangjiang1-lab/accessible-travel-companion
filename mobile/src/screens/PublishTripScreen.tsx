import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as tripService from '../services/tripService';
import FormInput from '../components/Input/FormInput';
import TypeSelector from '../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../components/TypeSelector/TypeSelector';
import Tag from '../components/Tag/Tag';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import ModeIndicator from '../components/ModeIndicator/ModeIndicator';

/**
 * PublishTripScreen — 行程发布页
 *
 * 表单字段：
 * 1. 出发地 + 目的地（文本输入）
 * 2. 陪行类型（志愿者免费 / 专业付费）
 * 3. 特殊需求（多选标签）
 * 4. 预算（专业陪护模式必填）
 * 5. 出发时间（立即 / 预约）
 * 6. 发布按钮
 *
 * 依赖：Step 3 组件库、Step 5 authStore
 */

/** 陪行类型选项 */
const COMPANION_OPTIONS: TypeOption[] = [
  {
    value: 'volunteer',
    icon: '🤝',
    label: '志愿者陪行',
    description: '经过认证的志愿者免费陪护',
  },
  {
    value: 'professional',
    icon: '💼',
    label: '专业陪护',
    description: '持证专业人员付费服务',
  },
];

/** 特殊需求标签 */
const SPECIAL_NEEDS_TAGS: string[] = [
  '轮椅通行',
  '盲道优先',
  '避开台阶',
  '手语沟通',
  '大字体提示',
  '坡道优先',
  '语音引导',
  '认知辅助',
];

/** 快捷金额选项（元/小时） */
const QUICK_BUDGETS = [30, 50, 80, 100, 150];

const PublishTripScreen: React.FC<{navigation: any; route: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {profile} = useAuthStore();

  // ---- 表单状态 ----
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [companionType, setCompanionType] = useState<'volunteer' | 'professional'>('volunteer');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetQuick, setBudgetQuick] = useState<number | null>(null);
  const [isNow, setIsNow] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 表单验证 ----
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!startAddress.trim()) {
      newErrors.startAddress = '请输入出发地';
    }
    if (!endAddress.trim()) {
      newErrors.endAddress = '请输入目的地';
    }
    if (startAddress.trim() && endAddress.trim() && startAddress.trim() === endAddress.trim()) {
      newErrors.endAddress = '出发地和目的地不能相同';
    }
    if (companionType === 'professional') {
      const budget = budgetQuick || parseInt(budgetInput, 10);
      if (!budget || budget <= 0) {
        newErrors.budget = '专业陪护请设置预算';
      }
    }
    if (!isNow && !startTime.trim()) {
      newErrors.startTime = '请选择预约时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [startAddress, endAddress, companionType, budgetQuick, budgetInput, isNow, startTime]);

  /** 切换特殊需求标签 */
  const toggleNeed = (tag: string) => {
    setSelectedNeeds(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  /** 提交发布 */
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const budgetCents = companionType === 'professional'
        ? (budgetQuick || parseInt(budgetInput, 10) || 0) * 100
        : undefined;

      const result = await tripService.createTrip({
        start_address: startAddress.trim(),
        end_address: endAddress.trim(),
        companion_type: companionType,
        special_needs: selectedNeeds.length > 0 ? selectedNeeds : undefined,
        budget_cents: budgetCents,
        start_time: !isNow && startTime ? new Date(startTime).toISOString() : undefined,
      });

      // 发布成功后跳转到匹配页面（类似滴滴等待接单界面）
      navigation.replace('Match', {tripId: result.id});
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || '请稍后重试';
      if (typeof window !== 'undefined') {
        window.alert('发布失败: ' + errMsg);
      }
      Alert.alert('发布失败', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, startAddress, endAddress, companionType, selectedNeeds, budgetQuick, budgetInput, isNow, startTime, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ============================================================ */}
        {/* 1. 页头 */}
        {/* ============================================================ */}
        <View style={[styles.header, {backgroundColor: colors.primary}]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              📝 发布行程
            </Text>
            <View style={{width: 36}} />
          </View>
          <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85}]}>
            填写行程信息，系统将为您匹配合适的陪行人
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 2. 出行模式提示 */}
        {/* ============================================================ */}
        {profile && (
          <View style={styles.modeBar}>
            <ModeIndicator mode={profile.disability_type} />
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: spacing.sm}}>
              将根据您的画像优化匹配
            </Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* 3. 行程表单 */}
        {/* ============================================================ */}
        <Card variant="card" style={styles.formCard}>
          {/* 出发地 */}
          <FormInput
            label="出发地"
            value={startAddress}
            onChangeText={setStartAddress}
            placeholder="输入出发地地址"
            required
            error={errors.startAddress}
            accessibilityLabel="出发地地址"
          />

          {/* 目的地 */}
          <FormInput
            label="目的地"
            value={endAddress}
            onChangeText={setEndAddress}
            placeholder="输入目的地地址"
            required
            error={errors.endAddress}
            accessibilityLabel="目的地地址"
          />

          {/* 陪行类型 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            <Text style={{color: colors.danger}}>* </Text>
            陪行类型
          </Text>
          <TypeSelector
            options={COMPANION_OPTIONS}
            selectedValue={companionType}
            onSelect={v => setCompanionType(v as 'volunteer' | 'professional')}
          />

          <View style={{height: spacing.md}} />

          {/* 特殊需求 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            特殊需求
            <Text style={{color: colors.textTertiary, fontWeight: fontWeight.regular as any, fontSize: fontSize.xs}}>
              （选填，可多选）
            </Text>
          </Text>
          <View style={styles.tagsWrap}>
            {SPECIAL_NEEDS_TAGS.map(tag => (
              <Tag
                key={tag}
                label={tag}
                selected={selectedNeeds.includes(tag)}
                onPress={() => toggleNeed(tag)}
                style={{marginRight: spacing.sm, marginBottom: spacing.sm}}
              />
            ))}
          </View>

          {/* 预算（专业陪护时显示） */}
          {companionType === 'professional' && (
            <View style={styles.budgetSection}>
              <FormInput
                label="预算（元/小时）"
                value={budgetInput}
                onChangeText={text => {
                  setBudgetInput(text);
                  setBudgetQuick(null);
                }}
                placeholder="输入时薪预算"
                keyboardType="numeric"
                required
                error={errors.budget}
                accessibilityLabel="预算金额"
              />
              <View style={styles.quickBudgetRow}>
                {QUICK_BUDGETS.map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.quickBudgetBtn,
                      {
                        backgroundColor: budgetQuick === amount ? colors.primaryLight : colors.bg,
                        borderColor: budgetQuick === amount ? colors.primary : colors.border,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                    onPress={() => {
                      setBudgetQuick(amount);
                      setBudgetInput('');
                    }}>
                    <Text style={{
                      color: budgetQuick === amount ? colors.primary : colors.textSecondary,
                      fontSize: fontSize.sm,
                      fontWeight: (budgetQuick === amount ? fontWeight.bold : fontWeight.regular) as any,
                    }}>
                      ¥{amount}/h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 出发时间 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            出发时间
          </Text>
          <View style={styles.timeToggle}>
            <TouchableOpacity
              style={[
                styles.timeToggleBtn,
                {
                  backgroundColor: isNow ? colors.primary : colors.bg,
                  borderColor: isNow ? colors.primary : colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setIsNow(true)}>
              <Text style={{
                color: isNow ? colors.textInverse : colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium as any,
              }}>
                ⚡ 现在出发
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeToggleBtn,
                {
                  backgroundColor: !isNow ? colors.primaryLight : colors.bg,
                  borderColor: !isNow ? colors.primary : colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => setIsNow(false)}>
              <Text style={{
                color: !isNow ? colors.primary : colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium as any,
              }}>
                📅 预约时间
              </Text>
            </TouchableOpacity>
          </View>

          {/* 预约时间输入 */}
          {!isNow && (
            <FormInput
              value={startTime}
              onChangeText={setStartTime}
              placeholder="如：2025-06-01 14:30"
              error={errors.startTime}
              accessibilityLabel="预约出发时间"
            />
          )}
        </Card>

        {/* ============================================================ */}
        {/* 4. 发布按钮 */}
        {/* ============================================================ */}
        <View style={styles.submitArea}>
          <Button
            title={isSubmitting ? '发布中...' : '🚀 发布行程'}
            variant="primary"
            size="block"
            disabled={isSubmitting}
            onPress={handleSubmit}
          />

          <Text style={[styles.footnote, {color: colors.textTertiary, fontSize: fontSize.xs}]}>
            {companionType === 'volunteer'
              ? '志愿者陪行服务完全免费，由平台认证志愿者提供'
              : '专业陪护人员持证上岗，费用透明，平台担保交易'}
          </Text>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    lineHeight: 28,
  },
  headerSub: {
    textAlign: 'center',
    lineHeight: 20,
  },

  // ---- 当前模式 ----
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ---- 表单 ----
  formCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  formLabel: {
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },

  // ---- 预算 ----
  budgetSection: {
    marginBottom: 8,
  },
  quickBudgetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -8,
    marginBottom: 12,
  },
  quickBudgetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },

  // ---- 时间 ----
  timeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeToggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },

  // ---- 提交 ----
  submitArea: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  footnote: {
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});

export default PublishTripScreen;

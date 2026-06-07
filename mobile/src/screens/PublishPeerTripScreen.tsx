import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as tripService from '../services/tripService';
import FormInput from '../components/Input/FormInput';
import Tag from '../components/Tag/Tag';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import ModeIndicator from '../components/ModeIndicator/ModeIndicator';

/**
 * PublishPeerTripScreen — 发布同行者行程
 *
 * 同行者模式专用，只需填写起终点等基础信息，
 * 无需选择陪行类型，系统自动匹配同行伙伴。
 */

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

const PublishPeerTripScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const {profile} = useAuthStore();

  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [isNow, setIsNow] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!startAddress.trim()) newErrors.startAddress = '请输入出发地';
    if (!endAddress.trim()) newErrors.endAddress = '请输入目的地';
    if (startAddress.trim() && endAddress.trim() && startAddress.trim() === endAddress.trim()) {
      newErrors.endAddress = '出发地和目的地不能相同';
    }
    if (!isNow && !startTime.trim()) newErrors.startTime = '请选择预约时间';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [startAddress, endAddress, isNow, startTime]);

  const toggleNeed = (tag: string) => {
    setSelectedNeeds(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await tripService.createTrip({
        start_address: startAddress.trim(),
        end_address: endAddress.trim(),
        companion_type: 'volunteer', // 同行模式默认，不影响匹配逻辑
        special_needs: selectedNeeds.length > 0 ? selectedNeeds : undefined,
        start_time: !isNow && startTime ? new Date(startTime).toISOString() : undefined,
      });

      // 开启同行者匹配
      await tripService.enablePeerMatching(result.id);

      // 跳转到同行者匹配页面
      navigation.replace('PeerMatching');
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || '请稍后重试';
      if (typeof window !== 'undefined') { window.alert('发布失败: ' + errMsg); }
      Alert.alert('发布失败', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, startAddress, endAddress, selectedNeeds, isNow, startTime, navigation]);

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* 页头 */}
        <View style={[styles.header, {backgroundColor: colors.primary}]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              🤝 发起同行
            </Text>
            <View style={{width: 36}} />
          </View>
          <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85}]}>
            填写行程信息，系统自动匹配优势互补的同行伙伴
          </Text>
        </View>

        {/* 出行模式提示 */}
        {profile && (
          <View style={styles.modeBar}>
            <ModeIndicator mode={profile.disability_type as any} />
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: spacing.sm}}>
              将根据您的画像智能匹配同行伙伴
            </Text>
          </View>
        )}

        {/* 表单 */}
        <Card variant="card" style={styles.formCard}>
          <FormInput
            label="出发地"
            value={startAddress}
            onChangeText={setStartAddress}
            placeholder="输入出发地地址"
            required
            error={errors.startAddress}
          />

          <FormInput
            label="目的地"
            value={endAddress}
            onChangeText={setEndAddress}
            placeholder="输入目的地地址"
            required
            error={errors.endAddress}
          />

          {/* 特殊需求 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            特殊需求
            <Text style={{color: colors.textTertiary, fontWeight: '400', fontSize: fontSize.xs}}>
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

          {/* 出发时间 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            出发时间
          </Text>
          <View style={styles.timeToggle}>
            <TouchableOpacity
              style={[styles.timeToggleBtn, {
                backgroundColor: isNow ? colors.primary : colors.bg,
                borderColor: isNow ? colors.primary : colors.border,
                borderRadius: borderRadius.full,
              }]}
              onPress={() => setIsNow(true)}>
              <Text style={{
                color: isNow ? colors.textInverse : colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium as any,
              }}>⚡ 现在出发</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeToggleBtn, {
                backgroundColor: !isNow ? colors.primaryLight : colors.bg,
                borderColor: !isNow ? colors.primary : colors.border,
                borderRadius: borderRadius.full,
              }]}
              onPress={() => setIsNow(false)}>
              <Text style={{
                color: !isNow ? colors.primary : colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium as any,
              }}>📅 预约时间</Text>
            </TouchableOpacity>
          </View>

          {!isNow && (
            <FormInput
              value={startTime}
              onChangeText={setStartTime}
              placeholder="如：2025-06-01 14:30"
              error={errors.startTime}
            />
          )}
        </Card>

        {/* 提交 */}
        <View style={styles.submitArea}>
          <Button
            title={isSubmitting ? '发布中...' : '🚀 发起同行匹配'}
            variant="primary"
            size="block"
            disabled={isSubmitting}
            onPress={handleSubmit}
          />
          <Text style={[styles.footnote, {color: colors.textTertiary, fontSize: fontSize.xs}]}>
            系统将自动匹配路线相近、残障类型互补的同行伙伴，全程免费
          </Text>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  scrollContent: {paddingBottom: 24},
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
  headerTitle: {lineHeight: 28},
  headerSub: {textAlign: 'center', lineHeight: 20},
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  formLabel: {marginBottom: 8, lineHeight: 20},
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
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

export default PublishPeerTripScreen;

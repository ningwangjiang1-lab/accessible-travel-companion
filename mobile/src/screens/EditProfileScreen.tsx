import React, {useState} from 'react';
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
import FormInput from '../components/Input/FormInput';
import TypeSelector from '../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../components/TypeSelector/TypeSelector';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';

/**
 * EditProfileScreen — 编辑资料页
 *
 * 可编辑字段：
 * - 姓名
 * - 残障类型（4 选 1）
 * - 辅助设备
 * - 导航偏好（4 选 1）
 * - 字体偏好（3 选 1）
 *
 * 依赖：Step 5 authStore、Step 3 组件库
 */

const DISABILITY_OPTIONS: TypeOption[] = [
  {value: 'physical', icon: '🦽', label: '肢体障碍', description: '轮椅/拐杖'},
  {value: 'visual', icon: '🦯', label: '视力障碍', description: '盲道/语音'},
  {value: 'hearing', icon: '🦻', label: '听力障碍', description: '视觉提示'},
  {value: 'cognitive', icon: '🧠', label: '认知障碍', description: '简化导航'},
];

const NAV_OPTIONS: TypeOption[] = [
  {value: 'barrier_free', icon: '✅', label: '完全无障碍', description: '无台阶全坡道'},
  {value: 'prefer_ramp', icon: '🔽', label: '偏好坡道', description: '优先找坡道'},
  {value: 'avoid_overpass', icon: '🌉', label: '避开天桥', description: '绕过人行天桥'},
  {value: 'flat_only', icon: '🟰', label: '仅平坦路', description: '避开所有高差'},
];

const FONT_OPTIONS: TypeOption[] = [
  {value: 'standard', icon: '📝', label: '标准', description: '默认字号'},
  {value: 'large', icon: '🔍', label: '大号', description: '放大 25%'},
  {value: 'extra_large', icon: '🔎', label: '特大', description: '放大 50%'},
];

const EditProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const {user, profile, updateProfile} = useAuthStore();

  // ---- 表单状态 ----
  const [name, setName] = useState(user?.name || '');
  const [disabilityType, setDisabilityType] = useState<string>(profile?.disability_type || 'physical');
  const [assistiveDevice, setAssistiveDevice] = useState(profile?.assistive_device || '');
  const [navPreference, setNavPreference] = useState<string>(profile?.nav_preference || 'barrier_free');
  const [fontPreference, setFontPreference] = useState<string>(profile?.font_preference || 'standard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 提交 */
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('请填写姓名', '姓名不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        name: name.trim(),
        disability_type: disabilityType,
        assistive_device: assistiveDevice.trim() || undefined,
        nav_preference: navPreference,
        font_preference: fontPreference,
      });
      Alert.alert('✅ 保存成功', '个人资料已更新', [
        {text: '好的', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      Alert.alert('保存失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>

      {/* 页头 */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            ✏️ 编辑资料
          </Text>
          <View style={{width: 36}} />
        </View>
      </View>

      {/* 姓名 */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: -spacing.lg}}>
        <FormInput
          label="姓名"
          value={name}
          onChangeText={setName}
          placeholder="请输入您的姓名"
          required
          maxLength={20}
        />
      </Card>

      {/* 残障类型 */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
          残障类型
        </Text>
        <TypeSelector
          options={DISABILITY_OPTIONS}
          selectedValue={disabilityType}
          onSelect={setDisabilityType}
        />
      </Card>

      {/* 辅助设备 */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <FormInput
          label="辅助设备（选填）"
          value={assistiveDevice}
          onChangeText={setAssistiveDevice}
          placeholder="如：轮椅、盲杖、助听器等"
          maxLength={30}
        />
      </Card>

      {/* 导航偏好 */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
          导航偏好
        </Text>
        <TypeSelector
          options={NAV_OPTIONS}
          selectedValue={navPreference}
          onSelect={setNavPreference}
        />
      </Card>

      {/* 字体偏好 */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
          字体大小
        </Text>
        <TypeSelector
          options={FONT_OPTIONS}
          selectedValue={fontPreference}
          onSelect={setFontPreference}
        />
      </Card>

      {/* 保存按钮 */}
      <View style={{marginHorizontal: spacing.lg, marginTop: spacing.lg}}>
        <Button
          title={isSubmitting ? '保存中...' : '💾 保存修改'}
          variant="primary"
          size="default"
          disabled={isSubmitting}
          onPress={handleSave}
        />
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  sectionTitle: {
    marginBottom: 12,
  },
});

export default EditProfileScreen;

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
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import FormInput from '../components/Input/FormInput';
import Divider from '../components/Divider/Divider';

/**
 * ProfessionalCertScreen — 专业陪护认证申请
 *
 * 流程：
 * 1. 填写个人资质信息
 * 2. 提交审核
 * 3. 审核通过后获得专业陪护标识
 */

const SPECIALTY_OPTIONS = [
  {value: 'physical_care', label: '肢体护理', icon: '🦽'},
  {value: 'sign_language', label: '手语翻译', icon: '🤟'},
  {value: 'guide', label: '视障引导', icon: '🦯'},
  {value: 'elderly_care', label: '老年陪护', icon: '👴'},
  {value: 'first_aid', label: '急救护理', icon: '🏥'},
];

const ProfessionalCertScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 表单 ----
  const [certName, setCertName] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');

  const toggleSpecialty = (value: string) => {
    setSpecialties(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    const isWeb = typeof window !== 'undefined';

    if (!certName.trim()) {
      if (isWeb) { window.alert('请输入资质名称'); }
      Alert.alert('请填写资质', '资质名称不能为空');
      return;
    }
    if (!issuingBody.trim()) {
      if (isWeb) { window.alert('请输入发证机构'); }
      Alert.alert('请填写发证机构', '发证机构不能为空');
      return;
    }
    if (specialties.length === 0) {
      if (isWeb) { window.alert('请至少选择一项专业特长'); }
      Alert.alert('请选择特长', '请至少选择一项专业特长');
      return;
    }

    setIsSubmitting(true);
    try {
      const api = require('../services/api').default;
      await api.post('/professional-certs', {
        cert_name: certName.trim(),
        cert_number: certNumber.trim() || undefined,
        issuing_body: issuingBody.trim(),
        specialties,
        hourly_rate_cents: hourlyRate ? parseInt(hourlyRate) * 100 : undefined,
      });

      const msg = '我们将尽快审核您的专业陪护资质申请';
      if (isWeb) { window.alert('✅ 申请已提交\n\n' + msg); }
      Alert.alert('✅ 申请已提交', msg, [
        {text: '好的', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || '请稍后重试';
      if (isWeb) { window.alert('提交失败: ' + errMsg); }
      Alert.alert('提交失败', errMsg);
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
      <View style={[styles.header, {backgroundColor: '#6B21A8'}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginLeft: 12}]}>
            💼 专业陪护认证
          </Text>
        </View>
        <Text style={{color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85, marginTop: 8}}>
          提交您的专业资质，审核通过后即可成为专业陪护，提供收费服务
        </Text>
      </View>

      <View style={{padding: spacing.lg}}>
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
          资质信息
        </Text>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md}}>
          请如实填写以下信息，我们将进行严格审核
        </Text>

        <FormInput
          label="资质名称 *"
          value={certName}
          onChangeText={setCertName}
          placeholder="如：护理员资格证、康复治疗师等"
          required
          maxLength={50}
        />

        <FormInput
          label="证书编号"
          value={certNumber}
          onChangeText={setCertNumber}
          placeholder="资质证书编号（选填）"
          maxLength={30}
        />

        <FormInput
          label="发证机构 *"
          value={issuingBody}
          onChangeText={setIssuingBody}
          placeholder="如：XX市卫生健康委员会"
          required
          maxLength={50}
        />

        <FormInput
          label="每小时费用（元）"
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="建议 30-200 元/小时"
          keyboardType="numeric"
          maxLength={6}
        />

        <Divider style={{marginVertical: spacing.md}} />

        {/* 专业特长 */}
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
          专业特长 *
        </Text>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md}}>
          请选择您擅长的服务领域（可多选）
        </Text>

        <View style={styles.specialtyGrid}>
          {SPECIALTY_OPTIONS.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.specialtyChip,
                {
                  backgroundColor: specialties.includes(s.value) ? '#6B21A8' + '20' : colors.surface,
                  borderColor: specialties.includes(s.value) ? '#6B21A8' : colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              onPress={() => toggleSpecialty(s.value)}
              activeOpacity={0.7}>
              <Text style={{fontSize: fontSize.sm, marginRight: 4}}>{s.icon}</Text>
              <Text style={{
                color: specialties.includes(s.value) ? '#6B21A8' : colors.textPrimary,
                fontSize: fontSize.sm,
                fontWeight: (specialties.includes(s.value) ? fontWeight.bold : fontWeight.normal) as any,
              }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Divider style={{marginVertical: spacing.lg}} />

        {/* 提交 */}
        <Button
          title={isSubmitting ? '提交中...' : '📤 提交专业陪护申请'}
          variant="primary"
          size="default"
          disabled={isSubmitting}
          onPress={handleSubmit}
        />

        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md, lineHeight: 18}}>
          提交后将由平台工作人员审核{'\n'}审核结果将在 5-7 个工作日内通知
        </Text>
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  scrollContent: {paddingBottom: 24},
  header: {
    paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTop: {flexDirection: 'row', alignItems: 'center'},
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {lineHeight: 28},
  sectionTitle: {marginBottom: 4, lineHeight: 24},
  specialtyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  specialtyChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5,
  },
});

export default ProfessionalCertScreen;

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
import * as facilityService from '../services/facilityService';
import type {FacilityType} from '../services/facilityService';
import {FACILITY_TYPE_MAP} from '../services/facilityService';
import FormInput from '../components/Input/FormInput';
import TypeSelector from '../components/TypeSelector/TypeSelector';
import type {TypeOption} from '../components/TypeSelector/TypeSelector';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';

/**
 * ReportFacilityScreen — 上报无障碍设施
 */

const FACILITY_TYPE_OPTIONS: TypeOption[] = Object.entries(FACILITY_TYPE_MAP).map(
  ([value, config]) => ({
    value,
    icon: config.icon,
    label: config.label,
  }),
);

const ReportFacilityScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  const [name, setName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('accessible_toilet');
  const [address, setAddress] = useState('');
  const [latStr, setLatStr] = useState('39.9');
  const [lonStr, setLonStr] = useState('116.4');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      const msg = '请输入设施名称';
      if (typeof window !== 'undefined') { window.alert(msg); }
      Alert.alert('提示', msg);
      return;
    }
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) {
      const msg = '请输入有效的经纬度坐标';
      if (typeof window !== 'undefined') { window.alert(msg); }
      Alert.alert('提示', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await facilityService.createFacility({
        name: name.trim(),
        facility_type: facilityType,
        lat,
        lon,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
      });
      const successMsg = '设施已上报，感谢您的贡献！';
      if (typeof window !== 'undefined') { window.alert('✅ 上报成功\n\n' + successMsg); }
      Alert.alert('✅ 上报成功', successMsg, [
        {text: '好的', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || '请稍后重试';
      if (typeof window !== 'undefined') { window.alert('上报失败: ' + errMsg); }
      Alert.alert('上报失败', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* 页头 */}
      <View style={[styles.header, {backgroundColor: colors.primary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            📝 上报设施
          </Text>
          <View style={{width: 36}} />
        </View>
        <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85}]}>
          添加新的无障碍设施，帮助更多用户
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.lg}}>
          {/* 设施名称 */}
          <FormInput
            label="设施名称"
            value={name}
            onChangeText={setName}
            placeholder="如：XX地铁站无障碍厕所"
            required
            maxLength={100}
          />

          {/* 设施类型 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            <Text style={{color: colors.danger}}>* </Text>
            设施类型
          </Text>
          <TypeSelector
            options={FACILITY_TYPE_OPTIONS}
            selectedValue={facilityType}
            onSelect={v => setFacilityType(v as FacilityType)}
          />

          <View style={{height: spacing.md}} />

          {/* 地址 */}
          <FormInput
            label="地址"
            value={address}
            onChangeText={setAddress}
            placeholder="如：北京市朝阳区XX路XX号"
            maxLength={200}
          />

          {/* 经纬度 */}
          <View style={styles.coordRow}>
            <View style={{flex: 1, marginRight: 8}}>
              <FormInput
                label="纬度 (lat)"
                value={latStr}
                onChangeText={setLatStr}
                placeholder="39.9"
                keyboardType="numeric"
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <FormInput
                label="经度 (lon)"
                value={lonStr}
                onChangeText={setLonStr}
                placeholder="116.4"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* 描述 */}
          <FormInput
            label="描述（选填）"
            value={description}
            onChangeText={setDescription}
            placeholder="补充设施的特点、开放时间等信息"
            maxLength={500}
          />
        </Card>

        {/* 提交按钮 */}
        <View style={{marginHorizontal: spacing.lg, marginTop: spacing.lg}}>
          <Button
            title={isSubmitting ? '上报中...' : '📤 提交上报'}
            variant="primary"
            size="block"
            disabled={isSubmitting}
            onPress={handleSubmit}
          />
          <Text style={[styles.footnote, {color: colors.textTertiary, fontSize: fontSize.xs}]}>
            用户上报的设施将标注为"用户报告"，审核通过后点亮认证标识
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
  // 页头
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
  formLabel: {marginBottom: 8, lineHeight: 20},
  coordRow: {flexDirection: 'row'},
  footnote: {textAlign: 'center', marginTop: 12, lineHeight: 18},
});

export default ReportFacilityScreen;

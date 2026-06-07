import React, {useState, useEffect, useRef} from 'react';
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
import * as uploadService from '../services/uploadService';

/**
 * ReportFacilityScreen — 上报无障碍设施
 * 支持 GPS 自动定位 + 手动修正
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
  const [latStr, setLatStr] = useState('');
  const [lonStr, setLonStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 照片上传
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // GPS 定位状态
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationError, setLocationError] = useState('');

  /** GPS 自动定位 */
  const handleGetLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('当前浏览器不支持 GPS 定位，请手动输入经纬度');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatStr(lat.toFixed(5));
        setLonStr(lon.toFixed(5));
        setLocationDetected(true);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('定位权限被拒绝，请在浏览器设置中允许定位');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('无法获取位置信息，请检查网络连接');
            break;
          case err.TIMEOUT:
            setLocationError('定位超时，请重试');
            break;
          default:
            setLocationError('定位失败，请手动输入经纬度');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  };

  // 首次进入自动定位
  useEffect(() => {
    handleGetLocation();
  }, []);

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
      const msg = '请获取 GPS 定位或手动输入经纬度';
      if (typeof window !== 'undefined') { window.alert(msg); }
      Alert.alert('提示', msg);
      return;
    }
    if (!photoUrl) {
      const msg = '请上传现场照片';
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
        photo_url: photoUrl,
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
          {/* GPS 自动定位 */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            📍 位置 <Text style={{color: colors.danger}}>*</Text>
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: locationDetected ? '#E8F5E9' : colors.primaryLight,
              borderRadius: borderRadius.md,
              padding: 14,
              marginBottom: spacing.md,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: locationDetected ? '#4CAF50' : colors.primary,
            }}
            onPress={handleGetLocation}
            disabled={isLocating}
            activeOpacity={0.7}>
            {isLocating ? (
              <Text style={{color: colors.primary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
                📡 正在获取位置...
              </Text>
            ) : locationDetected ? (
              <View style={{alignItems: 'center'}}>
                <Text style={{color: '#4CAF50', fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
                  ✅ 已定位
                </Text>
                <Text style={{color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4}}>
                  纬度 {latStr} 经度 {lonStr}
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                  点击重新定位
                </Text>
              </View>
            ) : (
              <Text style={{color: colors.primary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
                📍 点击获取当前位置
              </Text>
            )}
          </TouchableOpacity>

          {locationError ? (
            <Text style={{color: colors.warning || '#FF9800', fontSize: fontSize.xs, marginBottom: spacing.md, textAlign: 'center'}}>
              {locationError}
            </Text>
          ) : null}

          {/* 手动修正经纬度（可折叠） */}
          <View style={styles.coordRow}>
            <View style={{flex: 1, marginRight: 8}}>
              <FormInput
                label="纬度"
                value={latStr}
                onChangeText={setLatStr}
                placeholder="39.9"
                keyboardType="numeric"
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <FormInput
                label="经度"
                value={lonStr}
                onChangeText={setLonStr}
                placeholder="116.4"
                keyboardType="numeric"
              />
            </View>
          </View>

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

          {/* 现场照片（必填） */}
          <Text style={[styles.formLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}]}>
            📷 现场照片 <Text style={{color: colors.danger}}>*</Text>
          </Text>
          {typeof window !== 'undefined' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{display: 'none'}}
              onChange={async (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  try {
                    const result = await uploadService.uploadImage(file);
                    const fullUrl = `https://impartial-caring-production-3593.up.railway.app${result.url}`;
                    setPhotoUrl(fullUrl);
                  } catch {
                    if (typeof window !== 'undefined') { window.alert('图片上传失败，请重试'); }
                  }
                }
              }}
            />
          )}
          <TouchableOpacity
            style={{
              borderWidth: 1.5,
              borderColor: photoUrl ? '#4CAF50' : colors.danger,
              borderRadius: borderRadius.md,
              padding: 14,
              marginBottom: spacing.md,
              alignItems: 'center',
            }}
            activeOpacity={0.6}
            onPress={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}>
            {photoUrl ? (
              <View style={{alignItems: 'center'}}>
                <Text style={{color: '#4CAF50', fontSize: fontSize.sm}}>✅ 照片已上传</Text>
                {typeof window !== 'undefined' && (
                  <img
                    src={photoUrl}
                    alt="预览"
                    style={{width: 120, height: 90, objectFit: 'cover', borderRadius: 8, marginTop: 8}}
                  />
                )}
              </View>
            ) : (
              <View style={{alignItems: 'center'}}>
                <Text style={{color: colors.danger, fontSize: fontSize.sm}}>📷 点击上传现场照片（必填）</Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4}}>
                  便于工作人员核实设施情况
                </Text>
              </View>
            )}
          </TouchableOpacity>

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
  coordRow: {flexDirection: 'row', marginTop: 4},
  footnote: {textAlign: 'center', marginTop: 12, lineHeight: 18},
});

export default ReportFacilityScreen;

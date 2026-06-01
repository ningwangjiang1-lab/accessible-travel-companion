import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useTheme} from '../theme';
import * as certService from '../services/volunteerCertService';
import type {VolunteerCertification, CertType, CertTypeInfo} from '../services/volunteerCertService';
import {STATUS_CONFIG} from '../services/volunteerCertService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import FormInput from '../components/Input/FormInput';
import Divider from '../components/Divider/Divider';

/**
 * VolunteerCertScreen — 志愿者认证
 *
 * 页面结构（按状态）：
 * 1. 无认证 → 认证类型选择 + 申请表单
 * 2. 审核中 → 状态卡片（等待审核）
 * 3. 已通过 → 认证勋章 + 证书详情
 * 4. 未通过 → 状态卡片 + 重新申请按钮
 *
 * 依赖：Step 3 组件库、volunteerCertService
 */

const VolunteerCertScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  // ---- 状态 ----
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<VolunteerCertification | null>(null);
  const [hasCert, setHasCert] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- 申请表单 ----
  const [certTypes, setCertTypes] = useState<CertTypeInfo[]>([]);
  const [selectedType, setSelectedType] = useState<CertType>('basic');
  const [formRealName, setFormRealName] = useState('');
  const [formIdCard, setFormIdCard] = useState('');
  const [formTrainingDone, setFormTrainingDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 加载 ----
  const loadCertification = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await certService.getMyCertification();
      setHasCert(result.has_cert);
      setCert(result.certification);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCertTypes = useCallback(async () => {
    try {
      const result = await certService.getCertTypes();
      setCertTypes(result);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    loadCertification();
    loadCertTypes();
  }, [loadCertification, loadCertTypes]);

  // ---- 提交 ----
  const handleSubmit = async () => {
    if (!formRealName.trim()) {
      Alert.alert('请填写姓名', '真实姓名不能为空');
      return;
    }

    const idPattern = /^\d{17}[\dXx]$/;
    if (formIdCard.trim() && !idPattern.test(formIdCard.trim())) {
      Alert.alert('身份证号错误', '请输入正确的 18 位身份证号码');
      return;
    }

    setIsSubmitting(true);
    try {
      await certService.submitCertification({
        real_name: formRealName.trim(),
        id_card_number: formIdCard.trim() || undefined,
        cert_type: selectedType,
        training_completed: formTrainingDone,
      });

      Alert.alert('✅ 申请已提交', '我们将尽快审核您的认证申请', [
        {text: '好的', onPress: () => loadCertification()},
      ]);
    } catch (err: any) {
      Alert.alert('提交失败', err?.response?.data?.error || '请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 重新申请（rejected 状态） ----
  const handleRetry = () => {
    if (cert) {
      setSelectedType(cert.cert_type);
      setFormRealName(cert.real_name);
      setFormIdCard(cert.id_card_number || '');
      setFormTrainingDone(cert.training_completed);
    }
    // 通过 loadCertification 刷新
    setHasCert(false);
    setCert(null);
  };

  // ---- 当前选中类型的配置 ----
  const currentTypeConfig = certTypes.find(t => t.value === selectedType);

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* ============================================================ */}
      {/* 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.success}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginLeft: 12}]}>
            📜 志愿者认证
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.base}}>加载中...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerState}>
          <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>{errorMsg}</Text>
          <TouchableOpacity
            style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
            onPress={loadCertification}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : hasCert && cert ? (
        /* ============================================================ */
        /* 状态卡片：pending / approved / rejected */
        /* ============================================================ */
        <View style={{padding: spacing.lg}}>
          {(() => {
            const statusCfg = STATUS_CONFIG[cert.status];

            return (
              <>
                {/* 状态横幅 */}
                <Card
                  variant="card"
                  style={{
                    backgroundColor:
                      cert.status === 'approved'
                        ? colors.success + '10'
                        : cert.status === 'pending'
                          ? colors.warning + '10'
                          : colors.danger + '10',
                    borderWidth: 1,
                    borderColor:
                      cert.status === 'approved'
                        ? colors.success + '40'
                        : cert.status === 'pending'
                          ? colors.warning + '40'
                          : colors.danger + '40',
                  }}>
                  <View style={{alignItems: 'center', paddingVertical: spacing.md}}>
                    <Text style={{fontSize: 48, marginBottom: spacing.sm}}>
                      {statusCfg.icon}
                    </Text>
                    <Badge text={statusCfg.label} variant={statusCfg.variant} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: fontSize.sm,
                        textAlign: 'center',
                        marginTop: spacing.md,
                        lineHeight: 20,
                      }}>
                      {statusCfg.description}
                    </Text>
                  </View>

                  <Divider />

                  {/* 申请详情 */}
                  <View style={{paddingVertical: spacing.sm}}>
                    <DetailRow label="认证类型" value={`${currentTypeConfig?.icon || '📋'} ${currentTypeConfig?.label || cert.cert_type}`} colors={colors} fontSize={fontSize} fontWeight={fontWeight} />
                    <DetailRow label="真实姓名" value={cert.real_name} colors={colors} fontSize={fontSize} fontWeight={fontWeight} />
                    {cert.id_card_number && (
                      <DetailRow
                        label="身份证号"
                        value={cert.id_card_number.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2')}
                        colors={colors}
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                      />
                    )}
                    <DetailRow
                      label="培训状态"
                      value={cert.training_completed ? '✅ 已完成' : '⏳ 未完成'}
                      colors={colors}
                      fontSize={fontSize}
                      fontWeight={fontWeight}
                    />
                    <DetailRow
                      label="申请时间"
                      value={new Date(cert.created_at).toLocaleDateString('zh-CN')}
                      colors={colors}
                      fontSize={fontSize}
                      fontWeight={fontWeight}
                    />
                    {cert.reviewed_at && (
                      <DetailRow
                        label="审核时间"
                        value={new Date(cert.reviewed_at).toLocaleDateString('zh-CN')}
                        colors={colors}
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                      />
                    )}
                  </View>
                </Card>

                {/* approved 专属：认证勋章 */}
                {cert.status === 'approved' && (
                  <Card variant="card" style={{marginTop: spacing.md}}>
                    <View style={{alignItems: 'center', paddingVertical: spacing.md}}>
                      <Text style={{fontSize: 56, marginBottom: spacing.sm}}>🎖️</Text>
                      <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, textAlign: 'center'}}>
                        认证志愿者
                      </Text>
                      <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20}}>
                        您已成为平台认证志愿者{'\n'}可为需要帮助的人提供陪行服务
                      </Text>
                    </View>
                  </Card>
                )}

                {/* rejected 专属：重新申请 */}
                {cert.status === 'rejected' && (
                  <View style={{marginTop: spacing.lg}}>
                    <Button
                      title="🔄 重新申请认证"
                      variant="primary"
                      size="default"
                      onPress={handleRetry}
                    />
                  </View>
                )}
              </>
            );
          })()}
        </View>
      ) : (
        /* ============================================================ */
        /* 无认证 → 申请表单 */
        /* ============================================================ */
        <View style={{padding: spacing.lg}}>
          {/* 认证类型选择 */}
          <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
            选择认证类型
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md}}>
            请选择您要申请的志愿者认证类型（每人限申请一项）
          </Text>

          {certTypes.map(type => (
            <TouchableOpacity key={type.value} activeOpacity={0.7} onPress={() => setSelectedType(type.value)}>
              <Card
                variant="card"
                style={{
                  marginBottom: spacing.sm,
                  borderWidth: selectedType === type.value ? 2 : 0,
                  borderColor: selectedType === type.value ? colors.success : 'transparent',
                }}>
                <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                  <Text style={{fontSize: 28, marginRight: spacing.md, marginTop: 2}}>{type.icon}</Text>
                  <View style={{flex: 1}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any, flex: 1}}>
                        {type.label}
                      </Text>
                      {selectedType === type.value && (
                        <Badge text="已选" variant="success" />
                      )}
                    </View>
                    <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4, lineHeight: 20}}>
                      {type.description}
                    </Text>
                    {/* 要求列表 */}
                    <View style={{marginTop: spacing.sm}}>
                      {type.requirements.map((req, i) => (
                        <Text key={i} style={{color: colors.textTertiary, fontSize: fontSize.xs, lineHeight: 18}}>
                          • {req}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          <Divider style={{marginVertical: spacing.lg}} />

          {/* 个人信息表单 */}
          <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
            填写申请信息
          </Text>

          <FormInput
            label="真实姓名 *"
            value={formRealName}
            onChangeText={setFormRealName}
            placeholder="与身份证一致的真实姓名"
            required
            maxLength={20}
          />

          <FormInput
            label="身份证号（选填）"
            value={formIdCard}
            onChangeText={setFormIdCard}
            placeholder="18 位身份证号码"
            maxLength={18}
            keyboardType="default"
          />

          {/* 培训完成状态 */}
          <Card variant="card-flat" style={{marginBottom: spacing.lg}}>
            <TouchableOpacity
              style={styles.toggleRow}
              activeOpacity={0.6}
              onPress={() => setFormTrainingDone(prev => !prev)}>
              <View style={{flex: 1}}>
                <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any}}>
                  {currentTypeConfig?.icon || '📋'} 已完成{currentTypeConfig?.label || ''}培训
                </Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                  请确认您已完成相关培训课程
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  {
                    backgroundColor: formTrainingDone ? colors.success : colors.borderLight,
                    borderRadius: borderRadius.full,
                  },
                ]}>
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: colors.textInverse,
                      alignSelf: formTrainingDone ? 'flex-end' : 'flex-start',
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </Card>

          {/* 提交按钮 */}
          <Button
            title={isSubmitting ? '提交中...' : '📤 提交认证申请'}
            variant="primary"
            size="default"
            disabled={isSubmitting}
            onPress={handleSubmit}
          />

          {/* 说明 */}
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md, lineHeight: 18}}>
            提交后将由平台工作人员审核{'\n'}审核结果将在 3-5 个工作日内通知
          </Text>
        </View>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
};

/** 详情行子组件 */
const DetailRow: React.FC<{
  label: string;
  value: string;
  colors: any;
  fontSize: any;
  fontWeight: any;
}> = ({label, value, colors, fontSize, fontWeight}) => (
  <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6}}>
    <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>{label}</Text>
    <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
      {value}
    </Text>
  </View>
);

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
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    lineHeight: 28,
  },
  // ---- 分区 ----
  sectionTitle: {
    marginBottom: 4,
    lineHeight: 24,
  },
  // ---- 居中状态 ----
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  // ---- Toggle ----
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggle: {
    width: 48,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});

export default VolunteerCertScreen;

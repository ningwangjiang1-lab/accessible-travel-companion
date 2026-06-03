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
import type {VolunteerCertification} from '../services/volunteerCertService';
import {STATUS_CONFIG} from '../services/volunteerCertService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import FormInput from '../components/Input/FormInput';
import Divider from '../components/Divider/Divider';

/**
 * VolunteerCertScreen — 志愿者认证
 *
 * 流程：
 * 1. 无认证 → 培训学习 → 填写个人信息 → 提交申请
 * 2. 审核中 → 状态卡片
 * 3. 已通过 → 认证勋章
 * 4. 未通过 → 状态卡片 + 重新申请
 */

/** 培训模块内容 */
const TRAINING_MODULES = [
  {
    title: '无障碍意识培训',
    icon: '♿',
    content: '了解不同类型的残障（肢体、视力、听力、认知）及其出行障碍。学习如何正确使用无障碍设施，包括坡道、盲道、无障碍电梯等。掌握与残障人士沟通的基本礼仪和注意事项，尊重他们的独立性和尊严。',
  },
  {
    title: '陪行服务规范',
    icon: '🤝',
    content: '志愿者行为准则：准时到达约定地点，主动介绍自己，确认行程需求。陪行过程中保持适当的距离和沟通频率。不得擅自更改行程路线，尊重被陪护人的隐私。服务完成后及时确认到达，并请对方评价。',
  },
  {
    title: '紧急情况处理',
    icon: '🆘',
    content: '学习识别常见紧急情况：跌倒、突发疾病、设备故障等。掌握基本的急救知识和操作流程。知道如何快速联系平台客服和紧急联系人。了解 SOS 紧急求助功能的使用方法。保持冷静，优先保障被陪护人的安全。',
  },
];

const VolunteerCertScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  // ---- 状态 ----
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<VolunteerCertification | null>(null);
  const [hasCert, setHasCert] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- 培训状态 ----
  const [trainingStep, setTrainingStep] = useState(-1); // -1=未开始, 0/1/2=模块索引, 3=已完成
  const [trainingCompleted, setTrainingCompleted] = useState(false);

  // ---- 申请表单 ----
  const [formRealName, setFormRealName] = useState('');
  const [formIdCard, setFormIdCard] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- 加载 ----
  const loadCertification = useCallback(async () => {
    setErrorMsg('');
    try {
      const result = await certService.getMyCertification();
      setHasCert(result.has_cert);
      setCert(result.certification);
      if (result.certification) {
        setTrainingCompleted(result.certification.training_completed);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertification();
  }, [loadCertification]);

  // ---- 培训导航 ----
  const startTraining = () => setTrainingStep(0);
  const nextTrainingStep = () => {
    if (trainingStep < TRAINING_MODULES.length - 1) {
      setTrainingStep(s => s + 1);
    } else {
      setTrainingStep(TRAINING_MODULES.length); // 完成
      setTrainingCompleted(true);
    }
  };
  const prevTrainingStep = () => {
    if (trainingStep > 0) setTrainingStep(s => s - 1);
  };

  // ---- 提交 ----
  const handleSubmit = async () => {
    const isWeb = typeof window !== 'undefined';

    if (!formRealName.trim()) {
      if (isWeb) { window.alert('真实姓名不能为空'); }
      Alert.alert('请填写姓名', '真实姓名不能为空');
      return;
    }

    if (!formIdCard.trim()) {
      if (isWeb) { window.alert('身份证号为必填项'); }
      Alert.alert('请填写身份证号', '身份证号为必填项');
      return;
    }

    const idPattern = /^\d{17}[\dXx]$/;
    if (!idPattern.test(formIdCard.trim())) {
      if (isWeb) { window.alert('请输入正确的 18 位身份证号码'); }
      Alert.alert('身份证号错误', '请输入正确的 18 位身份证号码');
      return;
    }

    if (!trainingCompleted) {
      if (isWeb) { window.alert('请先完成基础培训课程'); }
      Alert.alert('请完成培训', '需要先完成全部培训模块才能提交认证');
      return;
    }

    setIsSubmitting(true);
    try {
      await certService.submitCertification({
        real_name: formRealName.trim(),
        id_card_number: formIdCard.trim(),
        cert_type: 'basic',
        training_completed: true,
      });

      const successMsg = '我们将尽快审核您的认证申请，审核结果将在 3-5 个工作日内通知';
      if (isWeb) { window.alert('✅ 申请已提交\n\n' + successMsg); }
      Alert.alert('✅ 申请已提交', successMsg, [
        {text: '好的', onPress: () => loadCertification()},
      ]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || '请稍后重试';
      if (isWeb) { window.alert('提交失败: ' + errMsg); }
      Alert.alert('提交失败', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- 重新申请（rejected 状态） ----
  const handleRetry = () => {
    if (cert) {
      setFormRealName(cert.real_name);
      setFormIdCard(cert.id_card_number || '');
      setTrainingCompleted(cert.training_completed);
      setTrainingStep(cert.training_completed ? TRAINING_MODULES.length : -1);
    }
    setHasCert(false);
    setCert(null);
  };

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
            onPress={() => navigation.navigate('ProfileMain')}>
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
                    <DetailRow label="认证类型" value="📋 基础志愿者培训" colors={colors} fontSize={fontSize} fontWeight={fontWeight} />
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
        /* 无认证 → 培训 + 申请表单 */
        /* ============================================================ */
        <View style={{padding: spacing.lg}}>
          {/* ============ 第一步：基础培训 ============ */}
          <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
            📖 基础志愿者培训
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md}}>
            在提交认证前，请完成以下三个培训模块的学习
          </Text>

          {/* 培训进度条 */}
          <View style={{flexDirection: 'row', marginBottom: spacing.md, gap: 4}}>
            {TRAINING_MODULES.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= trainingStep && trainingStep >= 0
                    ? colors.success
                    : colors.borderLight,
                }}
              />
            ))}
          </View>

          {/* 培训内容区域 */}
          {trainingStep === -1 ? (
            /* 未开始培训 */
            <Card variant="card" style={{marginBottom: spacing.lg}}>
              <View style={{alignItems: 'center', paddingVertical: spacing.lg}}>
                <Text style={{fontSize: 48, marginBottom: spacing.md}}>📚</Text>
                <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any, textAlign: 'center', marginBottom: spacing.sm}}>
                  基础志愿者培训课程
                </Text>
                <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg}}>
                  本培训包含无障碍意识、陪行规范和紧急处理三大模块{'\n'}
                  完成全部学习后方可提交认证申请
                </Text>

                {/* 模块预览 */}
                {TRAINING_MODULES.map((mod, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.bg,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      width: '100%',
                    }}>
                    <Text style={{fontSize: 28, marginRight: spacing.md}}>{mod.icon}</Text>
                    <View style={{flex: 1}}>
                      <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
                        {mod.title}
                      </Text>
                    </View>
                    <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>待学习</Text>
                  </View>
                ))}

                <Button
                  title="🚀 开始培训"
                  variant="primary"
                  size="default"
                  onPress={startTraining}
                  style={{marginTop: spacing.md}}
                />
              </View>
            </Card>
          ) : trainingStep >= 0 && trainingStep < TRAINING_MODULES.length ? (
            /* 培训学习中 */
            <Card variant="card" style={{marginBottom: spacing.lg}}>
              <View style={{paddingVertical: spacing.sm}}>
                {/* 当前模块标题 */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md}}>
                  <Text style={{fontSize: 36, marginRight: spacing.md}}>
                    {TRAINING_MODULES[trainingStep].icon}
                  </Text>
                  <View style={{flex: 1}}>
                    <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                      模块 {trainingStep + 1} / {TRAINING_MODULES.length}
                    </Text>
                    <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                      {TRAINING_MODULES[trainingStep].title}
                    </Text>
                  </View>
                </View>

                <Divider style={{marginBottom: spacing.md}} />

                {/* 培训内容 */}
                <View style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.md,
                  padding: spacing.lg,
                  marginBottom: spacing.lg,
                }}>
                  <Text style={{
                    color: colors.textPrimary,
                    fontSize: fontSize.sm,
                    lineHeight: 24,
                  }}>
                    {TRAINING_MODULES[trainingStep].content}
                  </Text>
                </View>

                {/* 导航按钮 */}
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  {trainingStep > 0 ? (
                    <TouchableOpacity
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        borderRadius: borderRadius.full,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      onPress={prevTrainingStep}>
                      <Text style={{color: colors.textSecondary, fontSize: fontSize.sm}}>‹ 上一模块</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        borderRadius: borderRadius.full,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      onPress={() => setTrainingStep(-1)}>
                      <Text style={{color: colors.textSecondary, fontSize: fontSize.sm}}>‹ 返回列表</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 24,
                      borderRadius: borderRadius.full,
                      backgroundColor: colors.success,
                    }}
                    onPress={nextTrainingStep}>
                    <Text style={{color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                      {trainingStep < TRAINING_MODULES.length - 1 ? '下一模块 ›' : '✅ 完成培训'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ) : (
            /* 培训已完成 */
            <Card variant="card" style={{marginBottom: spacing.lg}}>
              <View style={{alignItems: 'center', paddingVertical: spacing.md}}>
                <Text style={{fontSize: 40, marginBottom: spacing.sm}}>✅</Text>
                <Text style={{color: colors.success, fontSize: fontSize.base, fontWeight: fontWeight.bold as any, textAlign: 'center'}}>
                  培训已完成
                </Text>
                <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20}}>
                  您已通过全部三个培训模块{'\n'}请填写以下信息提交认证申请
                </Text>
                <TouchableOpacity
                  style={{marginTop: spacing.md, paddingVertical: 6, paddingHorizontal: 16}}
                  onPress={() => setTrainingStep(0)}>
                  <Text style={{color: colors.primary, fontSize: fontSize.xs}}>重新学习</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* ============ 第二步：个人信息（培训完成后才可填写） ============ */}
          {trainingCompleted && (
            <>
              <Divider style={{marginVertical: spacing.lg}} />

              <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
                📋 填写认证信息
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.md}}>
                请填写与身份证一致的真实信息，用于平台审核
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
                label="身份证号 *"
                value={formIdCard}
                onChangeText={setFormIdCard}
                placeholder="18 位身份证号码"
                required
                maxLength={18}
                keyboardType="default"
              />

              {/* 提交按钮 */}
              <Button
                title={isSubmitting ? '提交中...' : '📤 提交认证申请'}
                variant="primary"
                size="default"
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={{marginTop: spacing.md}}
              />

              {/* 说明 */}
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md, lineHeight: 18}}>
                提交后将由平台工作人员审核{'\n'}审核结果将在 3-5 个工作日内通知
              </Text>
            </>
          )}
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
});

export default VolunteerCertScreen;

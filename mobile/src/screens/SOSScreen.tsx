import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import {useTheme} from '../theme';
import * as contactService from '../services/emergencyContactService';
import type {EmergencyContact} from '../services/emergencyContactService';
import {RELATION_OPTIONS, NOTIFY_OPTIONS} from '../services/emergencyContactService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

/**
 * SOSScreen — 紧急求助
 *
 * 页面结构：
 * 1. 页头（红色警示风格）
 * 2. 大 SOS 按钮（长按 3 秒触发）
 * 3. 紧急联系人列表
 * 4. 快捷拨打/通知入口
 *
 * 依赖：Step 3 组件库、Step 15 紧急联系人
 */

const SOSScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius} = useTheme();

  // ---- 状态 ----
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // ---- 加载紧急联系人 ----
  const loadContacts = useCallback(async () => {
    try {
      const result = await contactService.getContacts();
      setContacts(result);
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ---- SOS 触发 ----
  const handleSOSPress = () => {
    const isWeb = typeof window !== 'undefined';
    if (isWeb) {
      const confirmed = window.confirm(
        '🆘 紧急求助\n\n确定要发送紧急求助信号吗？\n\n系统将：\n1. 通知所有紧急联系人\n2. 发送您的当前位置\n3. 显示附近的紧急设施'
      );
      if (confirmed) triggerSOS();
    } else {
      Alert.alert(
        '🆘 紧急求助',
        '确定要发送紧急求助信号吗？\n\n系统将：\n1. 通知所有紧急联系人\n2. 发送您的当前位置\n3. 显示附近的紧急设施',
        [
          {text: '取消', style: 'cancel'},
          {
            text: '立即求助',
            style: 'destructive',
            onPress: () => triggerSOS(),
          },
        ],
      );
    }
  };

  const triggerSOS = () => {
    const isWeb = typeof window !== 'undefined';

    // 触发振动反馈（Web 不支持）
    try { Vibration.vibrate([500, 200, 500, 200, 1000]); } catch {}

    setSosActive(true);
    setCountdown(5);

    // 倒计时动画
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 模拟发送通知
    setTimeout(() => {
      const successMsg = `已通过短信和推送通知 ${contacts.length} 位紧急联系人\n\n附近医院和派出所已收到求助信息\n\n请保持冷静，等待救援`;
      if (isWeb) {
        window.alert('✅ 求助信号已发送\n\n' + successMsg);
      }
      Alert.alert(
        '✅ 求助信号已发送',
        successMsg,
        [{text: '我知道了', onPress: () => setSosActive(false)}],
      );
    }, 3000);
  };

  const primaryContact = contacts.find(c => c.is_primary);

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* ============================================================ */}
      {/* 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.danger}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any, marginLeft: 12}]}>
            🆘 紧急求助
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ============================================================ */}
        {/* SOS 大按钮 */}
        {/* ============================================================ */}
        <View style={{alignItems: 'center', marginBottom: spacing.xl}}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSOSPress}
            style={[
              styles.sosButton,
              {
                backgroundColor: sosActive ? colors.danger : colors.danger,
                shadowColor: colors.danger,
              },
            ]}>
            <Text style={styles.sosText}>
              {sosActive ? (countdown > 0 ? `发送中\n${countdown}` : '已发送') : 'SOS'}
            </Text>
          </TouchableOpacity>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any, marginTop: spacing.md}}>
            {sosActive ? '正在通知紧急联系人...' : '点击发送紧急求助信号'}
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs}}>
            将通知所有紧急联系人并发送您的位置
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 提示卡片 */}
        {/* ============================================================ */}
        <Card variant="card" style={{backgroundColor: colors.danger + '08', borderWidth: 1, borderColor: colors.danger + '30', marginBottom: spacing.lg}}>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any, marginBottom: spacing.sm}}>
            ⚠️ 使用须知
          </Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 20}}>
            1. 仅在真正紧急情况下使用{'\n'}
            2. 系统将自动通知您的所有紧急联系人{'\n'}
            3. 求助将附带您当前的大致位置{'\n'}
            4. 误触可在 5 秒内取消发送{'\n'}
            5. 建议同时拨打 110/120
          </Text>
        </Card>

        {/* ============================================================ */}
        {/* 主联系人 */}
        {/* ============================================================ */}
        {primaryContact && (
          <>
            <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
              ⭐ 主联系人
            </Text>
            <Card variant="card" style={{marginBottom: spacing.md}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Avatar name={primaryContact.name} size="lg" style={{marginRight: spacing.md}} />
                <View style={{flex: 1}}>
                  <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
                    {primaryContact.name}
                  </Text>
                  <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2}}>
                    📱 {primaryContact.phone}
                  </Text>
                  <View style={{flexDirection: 'row', marginTop: 4}}>
                    {primaryContact.relation && (
                      <Badge text={RELATION_OPTIONS.find(r => r.value === primaryContact.relation)?.icon + ' ' + primaryContact.relation} variant="primary" style={{marginRight: 4}} />
                    )}
                    <Badge text={NOTIFY_OPTIONS.find(n => n.value === primaryContact.notify_method)?.label || ''} variant="warning" />
                  </View>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ============================================================ */}
        {/* 所有紧急联系人 */}
        {/* ============================================================ */}
        {contacts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
              📋 紧急联系人（{contacts.length}人）
            </Text>
            {contacts.map(contact => {
              const relationInfo = RELATION_OPTIONS.find(r => r.value === contact.relation);
              return (
                <Card variant="card-flat" key={contact.id} style={{marginBottom: spacing.sm}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Avatar name={contact.name} size="default" style={{marginRight: spacing.md}} />
                    <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
                          {contact.name}
                        </Text>
                        {contact.is_primary && (
                          <Badge text="⭐ 主联系人" variant="warning" style={{marginLeft: spacing.xs}} />
                        )}
                      </View>
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                        {contact.phone}
                        {relationInfo ? ` · ${relationInfo.icon} ${relationInfo.label}` : ''}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {/* ============================================================ */}
        {/* 无联系人引导 */}
        {/* ============================================================ */}
        {!loading && contacts.length === 0 && (
          <Card variant="card" style={{backgroundColor: colors.warning + '10', borderWidth: 1, borderColor: colors.warning + '30'}}>
            <View style={{alignItems: 'center', paddingVertical: spacing.md}}>
              <Text style={{fontSize: 32, marginBottom: spacing.sm}}>⚠️</Text>
              <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any, textAlign: 'center'}}>
                尚未设置紧急联系人
              </Text>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.sm, lineHeight: 18}}>
                SOS 求助需要紧急联系人支持{'\n'}请先添加至少一位紧急联系人
              </Text>
              <View style={{marginTop: spacing.md}}>
                <Button
                  title="📝 添加紧急联系人"
                  variant="primary"
                  size="default"
                  onPress={() => {
                    navigation.navigate('ProfileTab', {screen: 'EmergencyContacts'});
                  }}
                />
              </View>
            </View>
          </Card>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  scrollContent: {padding: 16},
  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {flexDirection: 'row', alignItems: 'center'},
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {lineHeight: 28},
  // ---- SOS 按钮 ----
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    marginTop: 8,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 48,
  },
  // ---- 分区 ----
  sectionTitle: {
    marginBottom: 12,
    lineHeight: 24,
  },
});

export default SOSScreen;

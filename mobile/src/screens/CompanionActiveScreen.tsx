import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {useTheme} from '../theme';
import * as sessionService from '../services/sessionService';
import type {SessionDetail} from '../services/sessionService';
import Avatar from '../components/Avatar/Avatar';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import ProgressBar from '../components/ProgressBar/ProgressBar';
import Divider from '../components/Divider/Divider';

/**
 * CompanionActiveScreen — 陪行中页面
 *
 * 页面结构：
 * 1. 琥珀色页头：陪行人姓名 + 状态
 * 2. 陪行人信息卡片（头像、评分、认证、标签）
 * 3. 行程进度（起点→进度条→终点 + 百分比）
 * 4. 会话状态摘要（已过时间、匹配分数）
 * 5. 快捷操作（聊天、电话、分享位置）
 * 6. 会话控制（暂停/恢复、完成、紧急求助）
 * 7. 行程详情折叠区
 *
 * 依赖：Step 3 组件库、Step 10 匹配
 */

/** 状态 → UI 映射 */
const STATUS_UI: Record<string, {label: string; color: string; icon: string; bg: string}> = {
  active: {label: '陪行中', color: '#10B981', icon: '🟢', bg: '#ECFDF5'},
  paused: {label: '已暂停', color: '#F59E0B', icon: '🟡', bg: '#FFFBEB'},
  completed: {label: '已完成', color: '#2B7BD6', icon: '✅', bg: '#E8F1FB'},
  emergency_ended: {label: '紧急结束', color: '#EF4444', icon: '🚨', bg: '#FEF2F2'},
};

/** 格式化经过时间 */
function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

const CompanionActiveScreen: React.FC<{route: any; navigation: any}> = ({route: routeParams, navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();

  // 支持从导航参数传入 sessionId，也支持自动获取活跃会话
  const sessionIdParam = (routeParams.params as {sessionId?: string})?.sessionId;

  // ---- 状态 ----
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // 脉冲动画（状态指示器）
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (session?.status === 'active') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 0.3, duration: 1000, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 1000, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [session?.status]);

  /** 加载会话数据 */
  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let data: SessionDetail;
      if (sessionIdParam) {
        data = await sessionService.getSessionDetail(sessionIdParam);
      } else {
        data = await sessionService.getActiveSession();
      }
      setSession(data);
      setElapsed(data.elapsed_minutes);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setErrorMsg('no_session');
      } else {
        setErrorMsg(err?.response?.data?.error || err?.message || '加载会话失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionIdParam]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // 每 30 秒刷新经过时间
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 60000); // 每分钟加 1
    return () => clearInterval(interval);
  }, [session]);

  /** 状态变更操作 */
  const handleStatusChange = async (
    newStatus: sessionService.SessionStatus,
    confirmMsg: string,
  ) => {
    if (!session) return;

    Alert.alert(
      '确认操作',
      confirmMsg,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '确定',
          style: newStatus === 'emergency_ended' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(newStatus);
            try {
              const updated = await sessionService.updateSessionStatus(session.id, newStatus);
              setSession(updated);

              // 完成后跳转到评价页
              if (newStatus === 'completed') {
                setTimeout(() => {
                  navigation.navigate('Rating', {sessionId: session.id});
                }, 300);
              }
            } catch (err: any) {
              Alert.alert('操作失败', err?.response?.data?.error || '请稍后重试');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  // ---- 加载中 ----
  if (isLoading) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: spacing.md}}>
          加载陪行会话...
        </Text>
      </View>
    );
  }

  // ---- 无会话 ----
  if (errorMsg === 'no_session' || !session) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <Text style={{fontSize: 48, marginBottom: spacing.md}}>🤝</Text>
        <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center', marginBottom: spacing.sm}}>
          没有进行中的陪行会话
        </Text>
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg}}>
          发布一个新行程{'\n'}匹配陪行人后即可开始陪行
        </Text>
        <Button title="返回" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // ---- 错误 ----
  if (errorMsg && errorMsg !== 'no_session') {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <Text style={{fontSize: 40, marginBottom: spacing.md}}>⚠️</Text>
        <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg}}>
          {errorMsg}
        </Text>
        <Button title="重试" variant="outline" onPress={loadSession} />
      </View>
    );
  }

  const statusUI = STATUS_UI[session.status] || STATUS_UI.active;
  const isActive = session.status === 'active';
  const isPaused = session.status === 'paused';
  const isTerminal = ['completed', 'emergency_ended'].includes(session.status);

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>

      {/* ============================================================ */}
      {/* 1. 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.secondary}]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            🤝 陪行中
          </Text>
          <View style={{width: 36}} />
        </View>
        {/* 陪行人姓名 + 状态 */}
        <View style={styles.headerCompanion}>
          <Avatar name={session.companion.name} size="lg" style={{marginRight: spacing.md}} />
          <View>
            <Text style={[styles.headerName, {color: colors.textInverse, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
              {session.companion.name}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
              <Animated.View style={[styles.statusDot, {backgroundColor: statusUI.color, opacity: isActive ? pulseAnim : 1}]} />
              <Text style={{color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.95}}>
                {statusUI.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. 陪行人信息卡片 */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: -spacing.lg}}>
        {/* 基本信息行 */}
        <View style={styles.companionRow}>
          <View style={styles.companionMain}>
            <Badge
              text={session.companion.role === 'volunteer' ? '🤝 志愿者' : '💼 专业陪护'}
              variant={session.companion.role === 'volunteer' ? 'success' : 'warning'}
            />
            {session.match_score !== null && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm}}>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>匹配分 </Text>
                <Text style={{color: colors.secondary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}}>
                  {session.match_score}
                </Text>
              </View>
            )}
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
              ⭐ {session.companion.rating}
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
              {session.companion.completed_trips} 次陪行
            </Text>
          </View>
        </View>

        <Divider />

        {/* 联系方式 */}
        <View style={styles.infoRow}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>📱 {session.companion.phone}</Text>
        </View>

        {/* 每小时费用 */}
        {session.companion.hourly_rate_cents && (
          <View style={styles.infoRow}>
            <Text style={{color: colors.secondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
              ¥{(session.companion.hourly_rate_cents / 100).toFixed(0)}/小时
            </Text>
          </View>
        )}

        {/* 认证 */}
        {session.companion.certifications.length > 0 && (
          <View style={styles.tagRow}>
            {session.companion.certifications.map((cert, i) => (
              <Badge key={i} text={`📜 ${cert}`} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
            ))}
          </View>
        )}

        {/* 标签 */}
        {session.companion.tags.length > 0 && (
          <View style={styles.tagRow}>
            {session.companion.tags.map((tag, i) => (
              <Badge key={`t-${i}`} text={tag} variant="success" style={{marginRight: 4, marginBottom: 4}} />
            ))}
          </View>
        )}
      </Card>

      {/* ============================================================ */}
      {/* 3. 行程进度 */}
      {/* ============================================================ */}
      <Card variant="card" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
          📍 行程进度
        </Text>

        {/* 起点 → 进度条 → 终点 */}
        <View style={styles.progressSection}>
          {/* 起点 */}
          <View style={styles.progressPoint}>
            <View style={[styles.progressDot, {backgroundColor: colors.success}]} />
            <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any, flex: 1}} numberOfLines={1}>
              {session.trip.start_address}
            </Text>
          </View>

          {/* 进度条 */}
          <View style={styles.progressBarArea}>
            <ProgressBar
              progress={session.progress_percent / 100}
              height={6}
              gradientColors={[colors.success, colors.primary, colors.secondary]}
            />
            {/* 当前位置标记 */}
            <Animated.View
              style={[
                styles.currentMarker,
                {
                  left: `${session.progress_percent}%`,
                  backgroundColor: colors.primary,
                  transform: [{scale: isActive ? pulseAnim : 1}],
                },
              ]}
            />
            <Text style={{color: colors.textTertiary, fontSize: fontSize['3xs'], textAlign: 'center', marginTop: 4}}>
              {session.progress_percent}%
            </Text>
          </View>

          {/* 终点 */}
          <View style={styles.progressPoint}>
            <View style={[styles.progressDot, {backgroundColor: colors.danger}]} />
            <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any, flex: 1}} numberOfLines={1}>
              {session.trip.end_address}
            </Text>
          </View>
        </View>

        {/* 陪行人位置提示 */}
        {session.companion_location && isActive && (
          <View style={[styles.locationHint, {backgroundColor: colors.primaryLight, borderRadius: borderRadius.md}]}>
            <Text style={{fontSize: fontSize.sm, marginRight: spacing.sm}}>📍</Text>
            <Text style={{color: colors.primary, fontSize: fontSize.xs, flex: 1}}>
              陪行人正在 {session.trip.start_address} 附近，距您约 3 分钟
            </Text>
          </View>
        )}
      </Card>

      {/* ============================================================ */}
      {/* 4. 会话状态摘要 */}
      {/* ============================================================ */}
      <View style={[styles.statusSummary, {marginHorizontal: spacing.lg}]}>
        <View style={styles.summaryItem}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>已陪行</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
            {formatElapsed(elapsed)}
          </Text>
        </View>
        <View style={[styles.summaryDivider, {backgroundColor: colors.border}]} />
        <View style={styles.summaryItem}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>行程状态</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.summaryDot, {backgroundColor: statusUI.color}]} />
            <Text style={{color: statusUI.color, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
              {statusUI.label}
            </Text>
          </View>
        </View>
        <View style={[styles.summaryDivider, {backgroundColor: colors.border}]} />
        <View style={styles.summaryItem}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>开始时间</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
            {new Date(session.started_at).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 5. 快捷操作（聊天 / 电话 / 位置） */}
      {/* ============================================================ */}
      {!isTerminal && (
        <View style={[styles.quickActions, {marginHorizontal: spacing.lg}]}>
          <TouchableOpacity
            style={[styles.quickBtn, {backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg}]}
            onPress={() => {
              // 跨 Tab 导航到消息 → 聊天详情
              navigation.navigate('MessagesTab', {
                screen: 'ChatDetail',
                params: {sessionId: session.id},
              });
            }}>
            <Text style={{fontSize: 24}}>💬</Text>
            <Text style={{color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any, marginTop: 4}}>
              聊天
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, {backgroundColor: colors.successLight, borderRadius: borderRadius.lg}]}
            onPress={() => {
              Alert.alert('📞 呼叫陪行人', `拨打 ${session.companion.name} 的电话：${session.companion.phone}`, [
                {text: '取消', style: 'cancel'},
                {text: '呼叫', onPress: () => {/* TODO: 真实拨号 */}},
              ]);
            }}>
            <Text style={{fontSize: 24}}>📞</Text>
            <Text style={{color: colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any, marginTop: 4}}>
              电话
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, {backgroundColor: colors.warningLight, borderRadius: borderRadius.lg}]}
            onPress={() => {/* TODO: Step 后续 — 位置共享 */}}>
            <Text style={{fontSize: 24}}>📍</Text>
            <Text style={{color: colors.secondaryDark, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any, marginTop: 4}}>
              位置
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================ */}
      {/* 6. 会话控制按钮 */}
      {/* ============================================================ */}
      {!isTerminal && (
        <View style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
          {/* 暂停 / 恢复 */}
          {isActive && (
            <Button
              title={actionLoading === 'paused' ? '处理中...' : '⏸️ 暂停陪行'}
              variant="outline"
              size="default"
              style={{marginBottom: spacing.sm}}
              disabled={!!actionLoading}
              onPress={() => handleStatusChange('paused', '确定要暂停当前陪行吗？')}
            />
          )}
          {isPaused && (
            <Button
              title={actionLoading === 'active' ? '处理中...' : '▶️ 恢复陪行'}
              variant="primary"
              size="default"
              style={{marginBottom: spacing.sm}}
              disabled={!!actionLoading}
              onPress={() => handleStatusChange('active', '确定要恢复陪行吗？')}
            />
          )}

          {/* 完成陪行 */}
          <Button
            title={actionLoading === 'completed' ? '处理中...' : '✅ 完成陪行'}
            variant="primary"
            size="default"
            style={{marginBottom: spacing.sm}}
            disabled={!!actionLoading}
            onPress={() => handleStatusChange('completed', '确认陪行已完成？完成后将进入评价页面。')}
          />

          {/* 紧急求助 */}
          <Button
            title={actionLoading === 'emergency_ended' ? '处理中...' : '🆘 紧急求助'}
            variant="danger"
            size="default"
            disabled={!!actionLoading}
            onPress={() =>
              handleStatusChange(
                'emergency_ended',
                '紧急求助将立即通知紧急联系人并结束当前陪行，确定继续？',
              )
            }
          />
        </View>
      )}

      {/* 已完成/紧急结束 — 返回按钮 */}
      {isTerminal && (
        <View style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
          <View style={[styles.terminalBanner, {backgroundColor: statusUI.bg, borderRadius: borderRadius.lg}]}>
            <Text style={{fontSize: 32, marginBottom: spacing.sm}}>{statusUI.icon}</Text>
            <Text style={{color: statusUI.color, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, textAlign: 'center'}}>
              {statusUI.label}
            </Text>
            {session.ended_at && (
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: spacing.xs}}>
                结束于 {new Date(session.ended_at).toLocaleString('zh-CN')}
              </Text>
            )}
          </View>
          <Button
            title="返回行程列表"
            variant="outline"
            size="default"
            style={{marginTop: spacing.md}}
            onPress={() => navigation.goBack()}
          />
        </View>
      )}

      {/* ============================================================ */}
      {/* 7. 行程详情 */}
      {/* ============================================================ */}
      <Card variant="card-flat" style={{marginHorizontal: spacing.lg, marginTop: spacing.md}}>
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
          📋 行程详情
        </Text>

        <View style={styles.detailRow}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, width: 56}}>出发地</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>{session.trip.start_address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, width: 56}}>目的地</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>{session.trip.end_address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, width: 56}}>陪行类型</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>
            {session.trip.companion_type === 'volunteer' ? '🤝 志愿者' : '💼 专业陪护'}
          </Text>
        </View>
        {session.trip.start_time && (
          <View style={styles.detailRow}>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, width: 56}}>计划时间</Text>
            <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>
              {new Date(session.trip.start_time).toLocaleString('zh-CN')}
            </Text>
          </View>
        )}
        {session.trip.special_needs.length > 0 && (
          <View style={styles.detailRow}>
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, width: 56}}>特殊需求</Text>
            <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
              {session.trip.special_needs.map((need, i) => (
                <Badge key={i} text={need} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
              ))}
            </View>
          </View>
        )}
      </Card>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

/** 刷新按钮组件（用于无会话状态） */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  headerCompanion: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  // ---- 陪行人信息 ----
  companionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  companionMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    marginTop: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  // ---- 行程进度 ----
  sectionTitle: {
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 4,
  },
  progressPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  progressBarArea: {
    position: 'relative',
    paddingLeft: 5,
    marginVertical: 8,
  },
  currentMarker: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  locationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },

  // ---- 状态摘要 ----
  statusSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },

  // ---- 快捷操作 ----
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickBtn: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- 完成/紧急结束横幅 ----
  terminalBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  // ---- 行程详情 ----
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
});

export default CompanionActiveScreen;

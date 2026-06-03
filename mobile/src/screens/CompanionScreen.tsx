import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as tripService from '../services/tripService';
import type {TripResult} from '../services/tripService';
import * as sessionService from '../services/sessionService';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import TripCard from '../components/Card/TripCard';
import Badge from '../components/Badge/Badge';
import ModeIndicator from '../components/ModeIndicator/ModeIndicator';

/**
 * CompanionScreen — 真人伴行主页
 *
 * 页面结构：
 * 1. 页头
 * 2. 当前模式 + 发起行程按钮
 * 3. 进行中的行程
 * 4. 历史行程列表
 *
 * 依赖：Step 3 组件库、Step 5 authStore
 */

/** 状态中文映射 */
const STATUS_LABELS: Record<string, string> = {
  pending: '匹配中...',
  matching: '匹配中...',
  matched: '已匹配',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

/** 状态颜色映射 */
const STATUS_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  matching: 'warning',
  matched: 'success',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'danger',
};

const CompanionScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {profile, mode} = useAuthStore();
  const canProvideService = useAuthStore(s => s.user?.role === 'volunteer' || s.user?.role === 'professional');

  const [trips, setTrips] = useState<TripResult[]>([]);
  const [serviceOrders, setServiceOrders] = useState<tripService.AcceptedTrip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const disabilityLabel: Record<string, string> = {
    physical: '♿ 肢体', visual: '🦯 视障', hearing: '🦻 听障', cognitive: '🧠 认知',
    elderly: '👴 高龄', unknown: '👤',
  };

  /** 加载行程列表 */
  const loadTrips = useCallback(async () => {
    try {
      const result = await tripService.getUserTrips(10, 0);
      setTrips(result);
    } catch {
      // 静默
    }
  }, []);

  /** 加载服务模式订单 */
  const loadServiceOrders = useCallback(async () => {
    try {
      const result = await tripService.getMyAcceptedTrips();
      setServiceOrders(result);
    } catch {
      // 静默
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mode === 'service') {
      await loadServiceOrders();
    } else {
      await loadTrips();
    }
    setRefreshing(false);
  }, [loadTrips, loadServiceOrders, mode]);

  // 每次切换到该页面时重新加载数据
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (mode === 'service') {
        loadServiceOrders();
      } else {
        loadTrips();
      }
    });
    return unsubscribe;
  }, [navigation, loadTrips, loadServiceOrders, mode]);

  // 初始加载
  React.useEffect(() => {
    if (mode === 'service') {
      loadServiceOrders();
    } else {
      loadTrips();
    }
  }, [loadTrips, loadServiceOrders, mode]);

  const activeTrips = trips.filter(t => ['pending', 'matching', 'matched', 'in_progress'].includes(t.status));
  const historyTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status));
  const activeOrders = serviceOrders.filter(o => ['matched', 'in_progress'].includes(o.status));
  const completedOrders = serviceOrders.filter(o => o.status === 'completed');

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }>

      {/* ============================================================ */}
      {/* ★ 服务模式视图 */}
      {/* ============================================================ */}
      {mode === 'service' && canProvideService ? (
        <>
          <View style={[styles.header, {backgroundColor: '#059669'}]}>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              🤝 陪护服务
            </Text>
            <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.9}]}>
              我接的单 · 为他人提供出行陪伴
            </Text>
          </View>

          {/* 进行中的订单 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
              🟢 进行中 ({activeOrders.length})
            </Text>
            {activeOrders.length === 0 ? (
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', padding: 20}}>
                暂无进行中的订单
              </Text>
            ) : (
              activeOrders.map(order => (
                <Card key={order.id} variant="card" style={{marginBottom: spacing.sm}}>
                  <View style={styles.tripHeader}>
                    <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any, flex: 1}}>
                      {order.user_name} · {disabilityLabel[order.disability_type]}
                    </Text>
                    <Badge text={order.status === 'in_progress' ? '进行中' : '待开始'} variant={order.status === 'in_progress' ? 'primary' : 'warning'} />
                  </View>
                  <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4}}>
                    📍 {order.start_address} → 🏁 {order.end_address}
                  </Text>
                  {order.special_needs?.length > 0 && (
                    <View style={styles.tripTags}>
                      {order.special_needs.map((tag: string, i: number) => (
                        <Badge key={i} text={tag} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
                      ))}
                    </View>
                  )}
                  {order.status === 'matched' && (
                    <TouchableOpacity
                      style={{marginTop: 12, backgroundColor: colors.success, borderRadius: 8, paddingVertical: 8, alignItems: 'center'}}
                      onPress={async () => {
                        try {
                          const session = await sessionService.startSession(order.id);
                          navigation.navigate('CompanionActive', {sessionId: session.id});
                          loadServiceOrders();
                        } catch (err: any) {
                          const isWeb = typeof window !== 'undefined';
                          const msg = err?.response?.data?.error || '开始陪行失败';
                          if (isWeb) { window.alert(msg); }
                        }
                      }}>
                      <Text style={{color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold as any}}>🚀 开始陪行</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              ))
            )}
          </View>

          {/* 已完成的订单 */}
          {completedOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
                ✅ 已完成 ({completedOrders.length})
              </Text>
              {completedOrders.map(order => (
                <Card key={order.id} variant="card-flat" style={{marginBottom: spacing.sm}}>
                  <View style={styles.tripHeader}>
                    <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, flex: 1}}>
                      {order.user_name} · {order.start_address} → {order.end_address}
                    </Text>
                    <Badge text="已完成" variant="success" />
                  </View>
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                    {new Date(order.created_at).toLocaleDateString('zh-CN')}
                  </Text>
                </Card>
              ))}
            </View>
          )}

          {serviceOrders.length === 0 && !refreshing && (
            <View style={styles.emptyState}>
              <Text style={{fontSize: 48, marginBottom: spacing.md}}>🤝</Text>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
                还没有接单记录
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginTop: 8}}>
                前往首页开启在线状态{'\n'}等待附近的出行需求推送
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          {/* ============================================================ */}
          {/* ★ 出行模式视图（原有内容） */}
          {/* ============================================================ */}
          <View style={[styles.header, {backgroundColor: colors.secondary}]}>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              🤝 真人伴行
            </Text>
            <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.9}]}>
              志愿者或专业人士为您提供出行陪伴
            </Text>
          </View>

          <View style={styles.actionBar}>
            {profile && profile.disability_type !== 'none' && (
              (profile.disability_type === 'physical' || profile.disability_type === 'visual' || profile.disability_type === 'hearing' || profile.disability_type === 'cognitive')
                ? <ModeIndicator mode={profile.disability_type as any} />
                : null
            )}
            <Button
              title="📝 发布新行程"
              variant="primary"
              size="default"
              onPress={() => navigation.navigate('PublishTrip')}
            />
          </View>

          <View style={{paddingHorizontal: 20, marginTop: 12}}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProfessionalList')}
              style={[styles.proBanner, {backgroundColor: colors.primaryLight, borderRadius: 12, borderColor: colors.primary + '30'}]}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{fontSize: 28, marginRight: 12}}>💼</Text>
                <View style={{flex: 1}}>
                  <Text style={{color: colors.primary, fontSize: 15, fontWeight: '600' as any}}>
                    浏览专业陪护人员
                  </Text>
                  <Text style={{color: colors.primary, fontSize: 12, opacity: 0.75, marginTop: 2}}>
                    查看持证专业人员的资质、评分与服务详情
                  </Text>
                </View>
                <Text style={{color: colors.primary, fontSize: 20}}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {activeTrips.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
                进行中
              </Text>
              {activeTrips.map(trip => (
                <TouchableOpacity
                  key={trip.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (['pending', 'matching', 'matched'].includes(trip.status)) {
                      navigation.navigate('Match', {tripId: trip.id});
                    } else if (trip.status === 'in_progress') {
                      navigation.navigate('CompanionActive', {});
                    }
                  }}>
                  <Card variant="card" style={{marginBottom: spacing.md}}>
                    <View style={styles.tripHeader}>
                      <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any, flex: 1}}>
                        {trip.start_address} → {trip.end_address}
                      </Text>
                      <Badge
                        text={STATUS_LABELS[trip.status] || trip.status}
                        variant={STATUS_COLORS[trip.status] || 'primary'}
                      />
                    </View>
                    <View style={styles.tripMeta}>
                      <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                        {trip.companion_type === 'volunteer' ? '🤝 志愿者' : '💼 专业陪护'}
                        {trip.budget_cents ? ` · ¥${(trip.budget_cents / 100).toFixed(0)}/h` : ' · 免费'}
                      </Text>
                      {trip.start_time && (
                        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                          📅 {new Date(trip.start_time).toLocaleString('zh-CN')}
                        </Text>
                      )}
                    </View>
                    {trip.special_needs.length > 0 && (
                      <View style={styles.tripTags}>
                        {trip.special_needs.map((tag, i) => (
                          <Badge key={i} text={tag} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
                        ))}
                      </View>
                    )}
                    {/* 取消按钮（仅 pending/matching 状态） */}
                    {['pending', 'matching'].includes(trip.status) && (
                      <TouchableOpacity
                        style={{marginTop: 8, alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 12}}
                        onPress={async (e) => {
                          e.stopPropagation?.();
                          const isWeb = typeof window !== 'undefined';
                          if (isWeb) {
                            if (!window.confirm('确定要取消该行程吗？')) return;
                          }
                          try {
                            await tripService.cancelTrip(trip.id);
                            loadTrips();
                          } catch (err: any) {
                            if (isWeb) { window.alert('取消失败: ' + (err?.response?.data?.error || '')); }
                          }
                        }}>
                        <Text style={{color: colors.danger, fontSize: fontSize.xs}}>取消行程</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {trips.length === 0 && !refreshing && (
            <View style={styles.emptyState}>
              <Text style={{fontSize: 48, marginBottom: spacing.md}}>🤝</Text>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center', marginBottom: spacing.sm}}>
                还没有行程记录
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg}}>
                发布您的第一个陪行需求{'\n'}让志愿者或专业人士为您护航
              </Text>
              <Button
                title="📝 发布第一个行程"
                variant="primary"
                size="default"
                onPress={() => navigation.navigate('PublishTrip')}
              />
            </View>
          )}

          {historyTrips.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
                历史行程
              </Text>
              {historyTrips.map(trip => (
                <Card key={trip.id} variant="card-flat" style={{marginBottom: spacing.sm}}>
                  <View style={styles.tripHeader}>
                    <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, flex: 1}}>
                      {trip.start_address} → {trip.end_address}
                    </Text>
                    <Badge
                      text={STATUS_LABELS[trip.status] || trip.status}
                      variant={STATUS_COLORS[trip.status] || 'primary'}
                    />
                  </View>
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                    {trip.companion_type === 'volunteer' ? '🤝 志愿者' : '💼 专业陪护'}
                    {' · '}
                    {new Date(trip.created_at).toLocaleDateString('zh-CN')}
                  </Text>
                </Card>
              ))}
            </View>
          )}
        </>
      )}

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

  // ---- 页头 ----
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    marginBottom: 6,
  },
  headerSub: {
    lineHeight: 20,
  },

  // ---- 操作栏 ----
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ---- 分区 ----
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    lineHeight: 24,
  },

  // ---- 行程卡片 ----
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripMeta: {
    marginBottom: 4,
  },
  tripTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  // ---- 空状态 ----
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  // ---- 专业陪护入口 ----
  proBanner: {
    padding: 16,
    borderWidth: 1,
  },
});

export default CompanionScreen;

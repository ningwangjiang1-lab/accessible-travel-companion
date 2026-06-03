import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as tripService from '../services/tripService';
import type {ActiveTrip} from '../services/tripService';
import SearchInput from '../components/Input/SearchInput';
import ModeIndicator from '../components/ModeIndicator/ModeIndicator';
import QuickAction from '../components/Card/QuickAction';
import TripCard from '../components/Card/TripCard';

/**
 * HomeScreen — 首页 Dashboard
 *
 * 页面结构：
 * 1. Hero 区域：蓝色渐变背景、分时段问候语、用户名、残障模式标签
 * 2. 搜索框（胶囊形，点击跳转搜索页）
 * 3. 模式指示器
 * 4. 2×2 快捷操作网格（AI伴行 / 真人伴行 / 设施查询 / 紧急求助）
 * 5. 当前行程卡片（有活跃行程时显示）
 *
 * 依赖：Step 3（共享组件）、Step 5（authStore）
 */

/** 根据当前时间返回问候语 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return '早上好';
  if (hour >= 12 && hour < 14) return '中午好';
  if (hour >= 14 && hour < 18) return '下午好';
  return '晚上好';
}

/** 快捷操作网格定义 */
const QUICK_ACTIONS = [
  {
    icon: '🤖',
    iconBg: '#E8F1FB',
    title: 'AI 伴行',
    subtitle: '智能无障碍导航',
    route: 'AICompanion' as const,
  },
  {
    icon: '🤝',
    iconBg: '#FFF7ED',
    title: '真人伴行',
    subtitle: '专业陪护服务',
    route: 'HumanCompanion' as const,
  },
  {
    icon: '🏢',
    iconBg: '#ECFDF5',
    title: '设施查询',
    subtitle: '无障碍设施地图',
    route: 'FacilitySearch' as const,
  },
  {
    icon: '🆘',
    iconBg: '#FEF2F2',
    title: '紧急求助',
    subtitle: '一键 SOS 呼救',
    route: 'SOS' as const,
  },
];

const HomeScreen: React.FC<{navigation?: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {user, profile, mode, switchMode} = useAuthStore();
  const canProvideService = user?.role === 'volunteer' || user?.role === 'professional';

  // 搜索关键词
  const [searchText, setSearchText] = useState('');

  // 活跃行程
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ---- 服务模式状态 ----
  const [isOnline, setIsOnline] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<tripService.AvailableTrip[]>([]);
  const [myOrders, setMyOrders] = useState<tripService.AcceptedTrip[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  const disabilityLabel: Record<string, string> = {
    physical: '♿ 肢体障碍', visual: '🦯 视障',
    hearing: '🦻 听障', cognitive: '🧠 认知障碍',
    elderly: '👴 高龄', unknown: '👤 未知',
  };

  /** 加载活跃行程 */
  const loadActiveTrip = useCallback(async () => {
    try {
      setTripLoading(true);
      const trip = await tripService.getActiveTrip();
      setActiveTrip(trip);
    } catch {
      setActiveTrip(null);
    } finally {
      setTripLoading(false);
    }
  }, []);

  /** 加载服务模式数据 */
  const loadServiceData = useCallback(async () => {
    setServiceLoading(true);
    try {
      const [trips, orders] = await Promise.all([
        tripService.getAvailableTrips(),
        tripService.getMyAcceptedTrips(),
      ]);
      setAvailableTrips(trips);
      setMyOrders(orders);
    } catch {
      // 静默
    } finally {
      setServiceLoading(false);
    }
  }, []);

  /** 接单 */
  const handleAcceptTrip = async (tripId: string) => {
    const isWeb = typeof window !== 'undefined';
    try {
      await tripService.acceptTrip(tripId);
      if (isWeb) { window.alert('✅ 接单成功！\n\n请前往「真人伴行」页面查看详情'); }
      loadServiceData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '接单失败';
      if (isWeb) { window.alert('接单失败\n\n' + msg); }
    }
  };

  /** 下拉刷新 */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mode === 'service') {
      await loadServiceData();
    } else {
      await loadActiveTrip();
    }
    setRefreshing(false);
  }, [loadActiveTrip, loadServiceData, mode]);

  // 页面挂载时加载
  useEffect(() => {
    loadActiveTrip();
  }, [loadActiveTrip]);

  // 服务模式切换时加载数据
  useEffect(() => {
    if (mode === 'service') {
      loadServiceData();
    }
  }, [mode, loadServiceData]);

  // 每次切换到该页面时重新加载数据
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      if (mode === 'service') {
        loadServiceData();
      } else {
        loadActiveTrip();
      }
    });
    return unsubscribe;
  }, [navigation, mode, loadServiceData, loadActiveTrip]);

  // 用户姓名（优先显示姓名，否则显示脱敏手机号）
  const displayName = user?.name || (user?.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-4) : '用户');

  return (
    <ScrollView
      style={[styles.scrollView, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }>

      {/* ============================================================ */}
      {/* 1. Hero 区域 */}
      {/* ============================================================ */}
      <View style={[styles.hero, {backgroundColor: colors.primary}]}>
        {/* 顶部行：问候 + 用户名 */}
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={[styles.greeting, {color: colors.textInverse}]}>
              {getGreeting()}，
            </Text>
            <Text
              style={[
                styles.userName,
                {
                  color: colors.textInverse,
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold as any,
                },
              ]}
              numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          {/* 模式标签（Hero 内半透明） */}
          {profile && profile.disability_type !== 'none' && (
            <View
              style={[
                styles.heroModeTag,
                {backgroundColor: colors.heroTagBg, borderRadius: borderRadius.full},
              ]}>
              <Text style={{color: colors.textInverse, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any}}>
                {profile.disability_type === 'physical' && '♿ 肢体障碍'}
                {profile.disability_type === 'visual' && '🦯 视障'}
                {profile.disability_type === 'hearing' && '🦻 听障'}
                {profile.disability_type === 'cognitive' && '🧠 认知障碍'}
                {profile.disability_type === 'elderly' && '👴 长辈模式'}
              </Text>
            </View>
          )}
        </View>

        {/* 搜索框 */}
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => {
            const trimmed = searchText.trim();
            if (trimmed) {
              navigation.navigate('FacilitySearch', {query: trimmed});
            } else {
              navigation.navigate('FacilitySearch');
            }
          }}
          placeholder="搜索目的地、设施..."
          accessibilityLabel="搜索目的地"
        />

        {/* 模式切换（类似滴滴乘客/司机切换） */}
        {canProvideService && (
          <View style={[styles.modeSwitch, {backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full}]}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                {borderRadius: borderRadius.full},
                mode === 'passenger' && {backgroundColor: '#fff'},
              ]}
              onPress={() => switchMode('passenger')}
              activeOpacity={0.8}>
              <Text style={{
                color: mode === 'passenger' ? colors.primary : colors.textInverse,
                fontSize: fontSize.xs,
                fontWeight: (mode === 'passenger' ? fontWeight.bold : fontWeight.medium) as any,
              }}>
                🧑 出行
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                {borderRadius: borderRadius.full},
                mode === 'service' && {backgroundColor: '#fff'},
              ]}
              onPress={() => switchMode('service')}
              activeOpacity={0.8}>
              <Text style={{
                color: mode === 'service' ? colors.primary : colors.textInverse,
                fontSize: fontSize.xs,
                fontWeight: (mode === 'service' ? fontWeight.bold : fontWeight.medium) as any,
              }}>
                🤝 服务
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ============================================================ */}
      {/* ★ 服务模式首页 */}
      {/* ============================================================ */}
      {mode === 'service' && canProvideService && (
        <View>
          {/* 在线/离线切换 */}
          <View style={[styles.section, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]}>
            <View>
              <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
                🤝 服务模式
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                {isOnline ? '已上线，等待派单中...' : '已离线'}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: 56, height: 30, borderRadius: 15,
                backgroundColor: isOnline ? colors.success : colors.border,
                justifyContent: 'center', paddingHorizontal: 3,
              }}
              onPress={() => setIsOnline(!isOnline)}
              activeOpacity={0.8}>
              <View style={{
                width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
                alignSelf: isOnline ? 'flex-end' : 'flex-start',
              }} />
            </TouchableOpacity>
          </View>

          {/* 我的接单统计 */}
          {myOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any, marginBottom: spacing.sm}}>
                📋 我的接单 ({myOrders.length})
              </Text>
              {myOrders.slice(0, 3).map(order => (
                <View key={order.id} style={{
                  backgroundColor: colors.surface, borderRadius: borderRadius.md,
                  padding: spacing.md, marginBottom: spacing.sm,
                  borderWidth: 1, borderColor: colors.borderLight,
                }}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                      {order.user_name} · {disabilityLabel[order.disability_type] || '👤'}
                    </Text>
                    <Text style={{
                      color: order.status === 'matched' ? colors.warning : order.status === 'in_progress' ? colors.success : colors.textTertiary,
                      fontSize: fontSize.xs, fontWeight: fontWeight.medium as any,
                    }}>
                      {order.status === 'matched' ? '待开始' : order.status === 'in_progress' ? '进行中' : order.status}
                    </Text>
                  </View>
                  <Text style={{color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4}}>
                    {order.start_address} → {order.end_address}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 附近待接单行程 */}
          <View style={styles.section}>
            <Text style={{color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, marginBottom: spacing.md}}>
              📍 附近出行需求
            </Text>

            {serviceLoading ? (
              <Text style={{color: colors.textTertiary, textAlign: 'center', padding: 24}}>加载中...</Text>
            ) : availableTrips.length === 0 ? (
              <View style={{alignItems: 'center', padding: 32}}>
                <Text style={{fontSize: 40, marginBottom: 12}}>📭</Text>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center'}}>
                  暂无待接单的出行需求
                </Text>
              </View>
            ) : (
              availableTrips.map(trip => (
                <TouchableOpacity
                  key={trip.id}
                  style={{
                    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
                    padding: spacing.md, marginBottom: spacing.sm,
                    borderWidth: 1, borderColor: colors.borderLight,
                  }}
                  activeOpacity={0.7}
                  onPress={() => handleAcceptTrip(trip.id)}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>
                          {trip.user_name}
                        </Text>
                        <Text style={{
                          color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium as any,
                          backgroundColor: colors.primaryLight, borderRadius: 9999,
                          paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8,
                        }}>
                          {disabilityLabel[trip.disability_type] || '👤'}
                        </Text>
                      </View>
                      <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 6}}>
                        📍 {trip.start_address}
                      </Text>
                      <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2}}>
                        🏁 {trip.end_address}
                      </Text>
                      {trip.special_needs && trip.special_needs.length > 0 && (
                        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 6}}>
                          🏷️ {trip.special_needs.join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={{
                      backgroundColor: colors.primary, borderRadius: borderRadius.full,
                      paddingVertical: 8, paddingHorizontal: 16, marginLeft: 12,
                    }}>
                      <Text style={{color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold as any}}>
                        接单
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* ★ 出行模式（以下所有内容） */}
      {/* ============================================================ */}
      {mode === 'passenger' && (<>
      {/* ============================================================ */}
      {/* 2. 模式指示器（Hero 下方，仅残障用户显示） */}
      {/* ============================================================ */}
      {profile && profile.disability_type !== 'none' && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.textPrimary,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold as any,
                marginBottom: spacing.md,
              },
            ]}>
            当前模式
          </Text>
          {(profile.disability_type === 'physical' || profile.disability_type === 'visual' || profile.disability_type === 'hearing' || profile.disability_type === 'cognitive') ? (
            <ModeIndicator mode={profile.disability_type as any} />
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primaryLight,
                borderRadius: 9999,
                paddingVertical: 6,
                paddingHorizontal: 12,
                alignSelf: 'flex-start',
              }}>
              <Text style={{fontSize: 16, marginRight: 4}}>👴</Text>
              <Text style={{color: colors.primary, fontSize: 14, fontWeight: '500' as any}}>
                长辈模式
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* 3. 快捷操作 2×2 网格 */}
      {/* ============================================================ */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textPrimary,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold as any,
              marginBottom: spacing.md,
            },
          ]}>
            快捷服务
          </Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action, index) => (
            <QuickAction
              key={action.route}
              icon={action.icon}
              iconBg={action.iconBg}
              title={action.title}
              subtitle={action.subtitle}
              style={[
                styles.quickItem,
                // 奇数项右 margin
                index % 2 === 0 && {marginRight: spacing.sm},
                // 前两行下 margin
                index < 2 && {marginBottom: spacing.sm},
              ]}
              onPress={() => {
                if (action.route === 'FacilitySearch') {
                  navigation.navigate('FacilitySearch');
                } else if (action.route === 'SOS') {
                  navigation.navigate('SOS');
                } else if (action.route === 'AICompanion') {
                  navigation.navigate('AITab');
                } else if (action.route === 'HumanCompanion') {
                  navigation.navigate('CompanionTab');
                }
              }}
            />
          ))}
        </View>
      </View>

      {/* ============================================================ */}
      {/* 4. 当前行程 */}
      {/* ============================================================ */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textPrimary,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold as any,
              marginBottom: spacing.md,
            },
          ]}>
            当前行程
          </Text>

        {activeTrip ? (
          <TripCard
            startLocation={activeTrip.start_address || '起点'}
            endLocation={activeTrip.end_address || '终点'}
            distance="--"
            duration="--"
            companionName={activeTrip.companion_name || undefined}
            progress={0.3}
            onPress={() => {
              // TODO: Step 8 导航到实时导航页
            }}
          />
        ) : (
          // 无活跃行程时的占位
          <View
            style={[
              styles.emptyTrip,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderWidth: 1,
                borderColor: colors.borderLight,
                padding: spacing.xl,
              },
            ]}>
            <Text style={{textAlign: 'center', fontSize: 32, marginBottom: spacing.sm}}>
              🗺️
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: fontSize.sm,
                textAlign: 'center',
                lineHeight: 20,
              }}>
              暂无进行中的行程
            </Text>
            <TouchableOpacity
              style={[
                styles.newTripBtn,
                {
                  backgroundColor: colors.primaryLight,
                  borderRadius: borderRadius.full,
                  marginTop: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  paddingHorizontal: spacing.xl,
                },
              ]}
              onPress={() => {
                navigation.navigate('CompanionTab', {screen: 'PublishTrip'});
              }}
              activeOpacity={0.8}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold as any,
                }}>
                + 发起新行程
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 底部安全区 */}
      <View style={{height: 24}} />
      </>)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // ---- Hero ----
  hero: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 2,
  },
  userName: {
    lineHeight: 28,
  },
  heroModeTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  // ---- 分区 ----
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    lineHeight: 24,
  },

  // ---- 快捷网格 ----
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickItem: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '48%' as any,
  },

  // ---- 空行程占位 ----
  emptyTrip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTripBtn: {
    alignSelf: 'center',
  },

  // ---- 模式切换 ----
  modeSwitch: {
    flexDirection: 'row',
    marginTop: 12,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
  },
});

export default HomeScreen;

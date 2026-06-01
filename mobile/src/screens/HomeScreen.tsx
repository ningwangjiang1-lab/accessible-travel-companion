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
  const {user, profile} = useAuthStore();

  // 搜索关键词
  const [searchText, setSearchText] = useState('');

  // 活跃行程
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** 加载活跃行程 */
  const loadActiveTrip = useCallback(async () => {
    try {
      setTripLoading(true);
      const trip = await tripService.getActiveTrip();
      setActiveTrip(trip);
    } catch {
      // 网络不可达或无活跃行程，静默处理
      setActiveTrip(null);
    } finally {
      setTripLoading(false);
    }
  }, []);

  /** 下拉刷新 */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActiveTrip();
    setRefreshing(false);
  }, [loadActiveTrip]);

  // 页面挂载时加载行程
  useEffect(() => {
    loadActiveTrip();
  }, [loadActiveTrip]);

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

          {/* 残障模式标签（Hero 内半透明） */}
          {profile && (
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
              </Text>
            </View>
          )}
        </View>

        {/* 搜索框 */}
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="搜索目的地、设施..."
          accessibilityLabel="搜索目的地"
        />
      </View>

      {/* ============================================================ */}
      {/* 2. 模式指示器（Hero 下方） */}
      {/* ============================================================ */}
      {profile && (
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
          <ModeIndicator mode={profile.disability_type} />
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
                // TODO: Step 9 跳转行程发布页
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
});

export default HomeScreen;

import React, {useState, useCallback} from 'react';
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
  const {profile} = useAuthStore();

  const [trips, setTrips] = useState<TripResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  /** 加载行程列表 */
  const loadTrips = useCallback(async () => {
    try {
      const result = await tripService.getUserTrips(10, 0);
      setTrips(result);
    } catch {
      // 静默处理网络错误
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }, [loadTrips]);

  // 首次加载
  React.useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const activeTrips = trips.filter(t => ['pending', 'matching', 'matched', 'in_progress'].includes(t.status));
  const historyTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status));

  return (
    <ScrollView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }>

      {/* ============================================================ */}
      {/* 1. 页头 */}
      {/* ============================================================ */}
      <View style={[styles.header, {backgroundColor: colors.secondary}]}>
        <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
          🤝 真人伴行
        </Text>
        <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.9}]}>
          志愿者或专业人士为您提供出行陪伴
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 2. 模式 + 发起按钮 */}
      {/* ============================================================ */}
      <View style={styles.actionBar}>
        {profile && <ModeIndicator mode={profile.disability_type} />}
        <Button
          title="📝 发布新行程"
          variant="primary"
          size="default"
          onPress={() => navigation.navigate('PublishTrip')}
        />
      </View>

      {/* ============================================================ */}
      {/* 3. 浏览专业陪护 */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* 4. 进行中的行程 */}
      {/* ============================================================ */}
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
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ============================================================ */}
      {/* 5. 空状态引导 */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* 6. 历史行程 */}
      {/* ============================================================ */}
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

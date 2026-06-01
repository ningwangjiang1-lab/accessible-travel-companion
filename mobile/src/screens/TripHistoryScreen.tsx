import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useTheme} from '../theme';
import * as tripService from '../services/tripService';
import type {TripResult} from '../services/tripService';
import Card from '../components/Card/Card';
import Badge from '../components/Badge/Badge';

/**
 * TripHistoryScreen — 行程历史
 *
 * 页面结构：
 * 1. 页头：📋 行程历史 + 总数
 * 2. FlatList 分页列表
 * 3. 空状态 + 下拉刷新 + 加载更多
 *
 * 依赖：Step 9 tripService
 */

/** 状态映射 */
const STATUS_CONFIG: Record<string, {label: string; variant: 'primary' | 'success' | 'warning' | 'danger'; icon: string}> = {
  pending: {label: '待匹配', variant: 'warning', icon: '⏳'},
  matching: {label: '匹配中', variant: 'warning', icon: '🔍'},
  matched: {label: '已匹配', variant: 'success', icon: '✅'},
  in_progress: {label: '进行中', variant: 'primary', icon: '🚶'},
  completed: {label: '已完成', variant: 'success', icon: '🏁'},
  cancelled: {label: '已取消', variant: 'danger', icon: '✕'},
};

const PAGE_SIZE = 15;

const TripHistoryScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing} = useTheme();

  const [trips, setTrips] = useState<TripResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  /** 加载 */
  const loadTrips = useCallback(async (reset: boolean = false) => {
    if (reset) setErrorMsg('');
    try {
      const offset = reset ? 0 : trips.length;
      const result = await tripService.getUserTrips(PAGE_SIZE, offset);

      if (reset) {
        setTrips(result);
      } else {
        setTrips(prev => [...prev, ...result]);
      }
      setHasMore(result.length >= PAGE_SIZE);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || '加载失败');
    }
  }, [trips.length]);

  React.useEffect(() => {
    loadTrips(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips(true);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadTrips(false);
    setLoadingMore(false);
  };

  /** 渲染单项 */
  const renderItem = ({item}: {item: TripResult}) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <Card variant="card" style={{marginBottom: spacing.sm}}>
        {/* 起终点 */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any, flex: 1}} numberOfLines={1}>
            {item.start_address} → {item.end_address}
          </Text>
          <Badge text={`${cfg.icon} ${cfg.label}`} variant={cfg.variant} />
        </View>

        {/* 元信息 */}
        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginRight: 12}}>
            {item.companion_type === 'volunteer' ? '🤝 志愿者' : '💼 专业陪护'}
          </Text>
          {item.budget_cents && (
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginRight: 12}}>
              ¥{(item.budget_cents / 100).toFixed(0)}/h
            </Text>
          )}
          {item.start_time && (
            <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
              📅 {new Date(item.start_time).toLocaleDateString('zh-CN')}
            </Text>
          )}
        </View>

        {/* 特殊需求标签 */}
        {item.special_needs.length > 0 && (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 8}}>
            {item.special_needs.map((need, i) => (
              <Badge key={i} text={need} variant="primary" style={{marginRight: 4, marginBottom: 4}} />
            ))}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* 页头 */}
      <View style={[styles.header, {backgroundColor: colors.primary, borderBottomColor: colors.borderLight}]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: 'rgba(255,255,255,0.2)'}]}
            onPress={() => navigation.goBack()}>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xl}}>←</Text>
          </TouchableOpacity>
          <View style={{marginLeft: 12}}>
            <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
              📋 行程历史
            </Text>
            <Text style={{color: colors.textInverse, fontSize: fontSize.xs, opacity: 0.85}}>
              共 {trips.length} 条行程
            </Text>
          </View>
        </View>
      </View>

      {/* 列表 */}
      {trips.length > 0 && (
        <FlatList
          data={trips}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', paddingVertical: 12}}>
                加载更多...
              </Text>
            ) : !hasMore ? (
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', paddingVertical: 12}}>
                — 已加载全部行程 —
              </Text>
            ) : null
          }
        />
      )}

      {/* 空状态 */}
      {!refreshing && trips.length === 0 && !errorMsg && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 48, marginBottom: 16}}>📋</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium as any, textAlign: 'center'}}>
            暂无行程记录
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8, lineHeight: 20}}>
            发布行程后即可在此查看{'\n'}所有历史记录
          </Text>
        </View>
      )}

      {/* 错误 */}
      {errorMsg && trips.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{fontSize: 40, marginBottom: 16}}>⚠️</Text>
          <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>{errorMsg}</Text>
          <TouchableOpacity
            style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primaryLight}}
            onPress={() => loadTrips(true)}>
            <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as any}}>重试</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});

export default TripHistoryScreen;

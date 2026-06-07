import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../theme';
import {useAuthStore} from '../store/authStore';
import * as routeService from '../services/routeService';
import type {RouteOption} from '../services/routeService';
import SearchInput from '../components/Input/SearchInput';
import RouteCard from '../components/Card/RouteCard';
import ModeIndicator from '../components/ModeIndicator/ModeIndicator';
import Tag from '../components/Tag/Tag';
import Button from '../components/Button/Button';
import Divider from '../components/Divider/Divider';
import type {DisabilityMode} from '../components/ModeIndicator/ModeIndicator';

/**
 * AIScreen — AI 智能导航规划页
 *
 * 页面流程：
 * 1. 输入目的地 → 点击"开始规划"
 * 2. 显示 2-3 条路线方案（RouteCard）
 * 3. 推荐路线高亮 + "推荐"徽章
 *
 * 依赖：Step 3 组件库、Step 5 authStore、Step 6 routeService
 */

/** 导航偏好 → emoji + 中文 */
const NAV_LABELS: Record<string, {emoji: string; label: string}> = {
  barrier_free: {emoji: '✅', label: '无障碍优先'},
  avoid_overpass: {emoji: '🌉', label: '避开天桥'},
  prefer_ramp: {emoji: '🔽', label: '优先坡道'},
  flat_only: {emoji: '🟰', label: '只走平路'},
};

/** 将逗号分隔的导航偏好转为中文标签数组 */
function parseNavLabels(navPreference: string | null | undefined): string[] {
  if (!navPreference) return [];
  return navPreference
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(v => NAV_LABELS[v] ? `${NAV_LABELS[v].emoji} ${NAV_LABELS[v].label}` : v);
}

const AIScreen: React.FC<{navigation?: any}> = ({navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {profile} = useAuthStore();

  // ---- 状态 ----
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('我的位置');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /** 执行路线规划 */
  const handlePlanRoutes = useCallback(async () => {
    if (!destination.trim()) return;

    setErrorMsg('');
    setIsLoading(true);
    setHasSearched(true);

    try {
      const originParam = origin !== '我的位置' ? origin : undefined;
      const result = await routeService.planRoutes(destination.trim(), originParam);
      setRoutes(result);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || '规划失败，请重试');
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [destination, origin]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, {backgroundColor: colors.bg}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ============================================================ */}
        {/* 1. 页头 */}
        {/* ============================================================ */}
        <View style={[styles.header, {backgroundColor: colors.primary}]}>
          <Text style={[styles.headerTitle, {color: colors.textInverse, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}]}>
            🤖 AI 智能导航
          </Text>
          <Text style={[styles.headerSub, {color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.85}]}>
            基于您的出行画像，为您规划最优无障碍路线
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 2. 规划表单 */}
        {/* ============================================================ */}
        <View style={styles.formSection}>
          {/* 出发地 */}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}]}>
              出发地
            </Text>
            <TouchableOpacity
              style={[
                styles.originBox,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.full,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                // TODO: 接入定位服务获取当前位置
              }}>
              <Text style={{fontSize: fontSize.sm, marginRight: spacing.sm}}>📍</Text>
              <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, flex: 1}}>
                {origin}
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>GPS</Text>
            </TouchableOpacity>
          </View>

          {/* 目的地 */}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, {color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}]}>
              目的地
            </Text>
            <SearchInput
              value={destination}
              onChangeText={setDestination}
              placeholder="输入目的地地址..."
              onSubmitEditing={handlePlanRoutes}
              accessibilityLabel="输入目的地地址"
            />
          </View>

          {/* 规划按钮 */}
          <Button
            title={isLoading ? '规划中...' : '🚀 开始规划无障碍路线'}
            variant="primary"
            size="block"
            disabled={!destination.trim() || isLoading}
            onPress={handlePlanRoutes}
          />
        </View>

        {/* ============================================================ */}
        {/* 3. 当前模式提示 */}
        {/* ============================================================ */}
        {profile && profile.disability_type !== 'none' && (
          <View style={styles.modeRow}>
            <Text style={[styles.modeLabel, {color: colors.textTertiary, fontSize: fontSize.xs}]}>
              出行模式：
            </Text>
            <ModeIndicator
              mode={profile.disability_type as DisabilityMode}
              style={{marginRight: spacing.sm}}
            />
            {parseNavLabels(profile.nav_preference).map((label, i) => (
              <Tag
                key={i}
                label={label}
                selected={true}
                style={{marginRight: spacing.xs, marginBottom: 4}}
              />
            ))}
          </View>
        )}

        <Divider style={{marginHorizontal: spacing.xl, marginTop: spacing.md}} />

        {/* ============================================================ */}
        {/* 4. 路线方案列表 */}
        {/* ============================================================ */}
        <View style={styles.resultsSection}>
          {/* 结果标题 */}
          {hasSearched && (
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}]}>
                路线方案
              </Text>
              {!isLoading && routes.length > 0 && (
                <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>
                  共 {routes.length} 条，按无障碍指数排序
                </Text>
              )}
            </View>
          )}

          {/* 加载中 */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, {color: colors.textTertiary, fontSize: fontSize.sm}]}>
                AI 正在为您规划最优无障碍路线...
              </Text>
              <View style={styles.skeletonCards}>
                {[1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.skeleton,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: borderRadius.lg,
                        borderWidth: 1,
                        borderColor: colors.borderLight,
                      },
                    ]}>
                    <View style={[styles.skeletonLine, {backgroundColor: colors.bg, width: '60%'}]} />
                    <View style={[styles.skeletonLine, {backgroundColor: colors.bg, width: '35%', marginTop: spacing.sm}]} />
                    <View style={[styles.skeletonLine, {backgroundColor: colors.bg, width: '80%', marginTop: spacing.sm}]} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 错误提示 */}
          {!isLoading && errorMsg !== '' && (
            <View style={[styles.errorBox, {backgroundColor: colors.dangerLight, borderRadius: borderRadius.md}]}>
              <Text style={{fontSize: 20, marginBottom: spacing.sm}}>⚠️</Text>
              <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center'}}>
                {errorMsg}
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, {marginTop: spacing.md}]}
                onPress={handlePlanRoutes}>
                <Text style={{color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
                  重试
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 路线列表 */}
          {!isLoading && routes.map(route => (
            <View key={route.id} style={{marginBottom: spacing.md}}>
              <RouteCard
                name={route.name}
                accessibilityScore={route.accessibility_score}
                distance={route.distance_display}
                duration={route.duration_display}
                features={route.features}
                isRecommended={route.is_recommended}
              />
              <TouchableOpacity
                style={[styles.navButton, {
                  backgroundColor: route.is_recommended ? colors.success : colors.primary,
                  borderRadius: borderRadius.md,
                }]}
                onPress={() => {
                  navigation.navigate('Navigation', {routeId: route.id});
                }}
                activeOpacity={0.8}>
                <Text style={[styles.navButtonText, {color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.bold as any}]}>
                  🗺️ 开始导航 · {route.duration_display} · {route.distance_display}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* 空结果（已搜索但无结果） */}
          {!isLoading && !errorMsg && hasSearched && routes.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={{fontSize: 40, marginBottom: spacing.sm}}>🗺️</Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center'}}>
                未找到合适的路线方案
              </Text>
            </View>
          )}

          {/* 未搜索时的引导 */}
          {!hasSearched && (
            <View style={styles.guideBox}>
              <Text style={{fontSize: 48, marginBottom: spacing.md}}>🔍</Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.medium as any,
                  textAlign: 'center',
                  marginBottom: spacing.sm,
                }}>
                输入目的地，AI 为您规划最佳无障碍路线
              </Text>
              <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20}}>
                路线将根据您的残障类型和导航偏好{'\n'}自动优化排序
              </Text>
            </View>
          )}
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 24,
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

  // ---- 规划表单 ----
  formSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldRow: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  originBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // ---- 当前模式 ----
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  modeLabel: {
    marginRight: 4,
  },

  // ---- 结果区 ----
  resultsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  resultsTitle: {
    lineHeight: 24,
  },

  // ---- 加载骨架 ----
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 16,
    marginBottom: 24,
  },
  skeletonCards: {
    width: '100%',
  },
  skeleton: {
    padding: 16,
    marginBottom: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },

  // ---- 错误 ----
  errorBox: {
    alignItems: 'center',
    padding: 24,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },

  // ---- 导航按钮 ----
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: -8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  navButtonText: {
    textAlign: 'center',
  },

  // ---- 空状态 ----
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  guideBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
});

export default AIScreen;

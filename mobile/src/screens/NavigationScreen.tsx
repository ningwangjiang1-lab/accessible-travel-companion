import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {useTheme} from '../theme';
import * as navigationService from '../services/navigationService';
import type {NavigationData, NavigationStep, ObstacleWarning} from '../services/navigationService';
import ProgressBar from '../components/ProgressBar/ProgressBar';
import Badge from '../components/Badge/Badge';
import Button from '../components/Button/Button';

/**
 * NavigationScreen — 实时导航页
 *
 * 页面结构：
 * 1. 紧凑顶部栏：路线名 + 无障碍指数 + 关闭按钮
 * 2. 模拟地图区：路线概览（起点→进度→终点）+ 当前位置标记
 * 3. 当前导航指令卡片（大号、醒目）
 * 4. 行程进度（距离/时间/无障碍指数）
 * 5. 障碍警告卡片列表
 * 6. 逐向导航步骤列表
 * 7. 底部操作栏：暂停/继续 | SOS | 结束导航
 *
 * 依赖：Step 3 组件库、Step 7 路线规划
 */

/** 步骤类型 → emoji */
const STEP_ICONS: Record<string, string> = {
  straight: '⬆️',
  turn_left: '↩️',
  turn_right: '↪️',
  elevator: '🛗',
  ramp: '🔽',
  stairs_up: '🪜',
  stairs_down: '🪜',
  crosswalk: '🚸',
  underpass: '🏃',
  overpass: '🌉',
  arrive: '🏁',
};

/** 无障碍等级 → 颜色和emoji */
const ACCESSIBILITY_COLORS: Record<string, {color: string; icon: string}> = {
  good: {color: '#10B981', icon: '✅'},
  ok: {color: '#F59E0B', icon: 'ℹ️'},
  warning: {color: '#F59E0B', icon: '⚠️'},
  danger: {color: '#EF4444', icon: '🚫'},
};

/** 障碍严重度 → 颜色 */
const SEVERITY_COLORS: Record<string, string> = {
  low: '#F59E0B',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

const NavigationScreen: React.FC<{route: any; navigation: any}> = ({route: routeParams, navigation}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();
  const {routeId} = routeParams.params as {routeId: string};

  // ---- 状态 ----
  const [navData, setNavData] = useState<NavigationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showObstacles, setShowObstacles] = useState(true);

  // 动画脉冲（当前位置标记）
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1.3, duration: 800, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPaused]);

  /** 加载导航数据 */
  const loadNavigation = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await navigationService.getNavigationData(routeId);
      setNavData(data);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || '加载导航数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadNavigation();
  }, [loadNavigation]);

  /** 模拟导航推进（定时前进到下一步） */
  useEffect(() => {
    if (!navData || isPaused || isLoading) return;

    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < navData.steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 8000); // 每 8 秒推进一步（演示用）

    return () => clearInterval(interval);
  }, [navData, isPaused, isLoading]);

  // 当前步骤
  const currentStep: NavigationStep | null = navData?.steps[currentStepIndex] ?? null;
  const totalSteps = navData?.steps.length ?? 0;
  const navigationProgress = totalSteps > 0 ? (currentStepIndex + 1) / totalSteps : 0;
  const isArrived = currentStepIndex >= totalSteps - 1 && totalSteps > 0;

  // ---- 加载中 ----
  if (isLoading) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: colors.textTertiary, fontSize: fontSize.sm, marginTop: spacing.md}}>
          加载导航数据...
        </Text>
      </View>
    );
  }

  // ---- 错误 ----
  if (errorMsg || !navData) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.bg}]}>
        <Text style={{fontSize: 40, marginBottom: spacing.md}}>⚠️</Text>
        <Text style={{color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.lg}}>
          {errorMsg || '无法加载导航数据'}
        </Text>
        <Button title="返回" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, {backgroundColor: colors.bg}]}>
      {/* ============================================================ */}
      {/* 1. 顶部导航栏 */}
      {/* ============================================================ */}
      <View style={[styles.topBar, {backgroundColor: colors.surface, borderBottomColor: colors.borderLight}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={{fontSize: fontSize.lg}}>✕</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text
            style={[styles.topBarTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}
            numberOfLines={1}>
            {navData.route.name}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{color: colors.success, fontSize: fontSize.sm, fontWeight: fontWeight.bold as any}}>
              {navData.route.accessibility_score}
            </Text>
            <Text style={{color: colors.textTertiary, fontSize: fontSize['4xs']}}>分</Text>
          </View>
        </View>
        <View style={{width: 36}} />
      </View>

      {/* ============================================================ */}
      {/* 2. 模拟地图区 */}
      {/* ============================================================ */}
      <View style={[styles.mapArea, {backgroundColor: '#E8F1FB'}]}>
        {/* 路线概览 */}
        <View style={styles.mapRoute}>
          {/* 起点 */}
          <View style={styles.mapPoint}>
            <View style={[styles.mapDot, {backgroundColor: colors.success}]} />
            <Text style={[styles.mapLabel, {color: colors.textSecondary, fontSize: fontSize.xs}]}>
              {navData.route.origin_address}
            </Text>
          </View>

          {/* 路线进度线 */}
          <View style={styles.mapProgressArea}>
            <ProgressBar
              progress={navigationProgress}
              height={4}
              gradientColors={[colors.success, colors.primary, colors.secondary]}
              style={{marginVertical: spacing.sm}}
            />
            {/* 当前位置脉冲标记 */}
            <Animated.View
              style={[
                styles.currentDot,
                {
                  left: `${navigationProgress * 100}%`,
                  backgroundColor: colors.primary,
                  transform: [{scale: pulseAnim}],
                },
              ]}
            />
          </View>

          {/* 终点 */}
          <View style={styles.mapPoint}>
            <View style={[styles.mapDot, {backgroundColor: colors.danger}]} />
            <Text style={[styles.mapLabel, {color: colors.textSecondary, fontSize: fontSize.xs}]}>
              {navData.route.destination_address}
            </Text>
          </View>
        </View>

        {/* 模拟地图背景提示 */}
        <Text style={[styles.mapHint, {color: colors.textTertiary, fontSize: fontSize['3xs']}]}>
          📍 GPS 定位中 · 模拟导航
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 3. 当前导航指令（醒目大卡片） */}
      {/* ============================================================ */}
      {currentStep && !isArrived && (
        <View
          style={[
            styles.currentInstruction,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderLeftWidth: 4,
              borderLeftColor: ACCESSIBILITY_COLORS[currentStep.accessibility_level]?.color ?? colors.primary,
              marginHorizontal: spacing.lg,
              marginTop: -spacing.md,
              ...shadows.lg.ios,
              elevation: shadows.lg.android.elevation,
            },
          ]}>
          <View style={styles.instructionHeader}>
            <Text style={{fontSize: 28}}>
              {STEP_ICONS[currentStep.type] || '📍'}
            </Text>
            <Badge
              text={`步骤 ${currentStep.index}/${totalSteps}`}
              variant="primary"
            />
          </View>
          <Text
            style={[
              styles.instructionText,
              {color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any},
            ]}>
            {currentStep.instruction}
          </Text>
          {currentStep.accessibility_note && (
            <View style={[styles.accessibilityBadge, {
              backgroundColor: currentStep.accessibility_level === 'danger'
                ? colors.dangerLight
                : currentStep.accessibility_level === 'warning'
                ? colors.warningLight
                : colors.successLight,
            }]}>
              <Text style={{fontSize: fontSize.xs, marginRight: spacing.xs}}>
                {ACCESSIBILITY_COLORS[currentStep.accessibility_level]?.icon}
              </Text>
              <Text style={{
                color: currentStep.accessibility_level === 'danger' ? colors.danger
                  : currentStep.accessibility_level === 'warning' ? colors.secondaryDark
                  : colors.success,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.medium as any,
                flex: 1,
              }}>
                {currentStep.accessibility_note}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 到达提示 */}
      {isArrived && (
        <View style={[styles.arrivedCard, {backgroundColor: colors.successLight, borderRadius: borderRadius.lg, marginHorizontal: spacing.lg, marginTop: -spacing.md}]}>
          <Text style={{fontSize: 40, marginBottom: spacing.sm}}>🎉</Text>
          <Text style={{color: colors.success, fontSize: fontSize.xl, fontWeight: fontWeight.bold as any}}>
            已到达目的地！
          </Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs}}>
            {navData.route.destination_address}
          </Text>
        </View>
      )}

      {/* ============================================================ */}
      {/* 4. 行程进度摘要 */}
      {/* ============================================================ */}
      <View style={[styles.progressSummary, {borderBottomColor: colors.borderLight}]}>
        <View style={styles.progressItem}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>剩余距离</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
            {navData.route.distance_display}
          </Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>预计时间</Text>
          <Text style={{color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
            {navData.route.duration_display}
          </Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>无障碍指数</Text>
          <Text style={{color: colors.success, fontSize: fontSize.base, fontWeight: fontWeight.semibold as any}}>
            {navData.route.accessibility_score} 分
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 5. 可滚动内容区（障碍警告 + 步骤列表） */}
      {/* ============================================================ */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ---- 障碍警告 ---- */}
        {navData.obstacles.length > 0 && showObstacles && (
          <View style={styles.obstaclesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any}]}>
                ⚠️ 前方障碍警告
              </Text>
              <TouchableOpacity onPress={() => setShowObstacles(false)}>
                <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>收起</Text>
              </TouchableOpacity>
            </View>
            {navData.obstacles.map(obs => (
              <ObstacleCard key={obs.id} obstacle={obs} colors={colors} fontSize={fontSize} spacing={spacing} borderRadius={borderRadius} />
            ))}
          </View>
        )}

        {navData.obstacles.length > 0 && !showObstacles && (
          <TouchableOpacity
            style={[styles.obstaclesToggle, {backgroundColor: colors.warningLight, borderRadius: borderRadius.md}]}
            onPress={() => setShowObstacles(true)}>
            <Text style={{fontSize: fontSize.sm, marginRight: spacing.sm}}>⚠️</Text>
            <Text style={{color: colors.secondaryDark, fontSize: fontSize.sm, fontWeight: fontWeight.medium as any}}>
              {navData.obstacles.length} 个障碍警告 — 点击查看
            </Text>
          </TouchableOpacity>
        )}

        {/* ---- 逐向导航步骤 ---- */}
        <View style={styles.stepsSection}>
          <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold as any, marginBottom: spacing.md}]}>
            📋 导航步骤
          </Text>
          {navData.steps.map((step, idx) => {
            const isCurrentStep = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;

            return (
              <View
                key={step.index}
                style={[
                  styles.stepItem,
                  {
                    backgroundColor: isCurrentStep ? colors.primaryLight : colors.surface,
                    borderRadius: borderRadius.md,
                    borderLeftWidth: 3,
                    borderLeftColor: isCompleted ? colors.success
                      : isCurrentStep ? colors.primary
                      : colors.border,
                    opacity: isCompleted ? 0.6 : 1,
                  },
                ]}>
                {/* 步骤编号/图标 */}
                <View style={styles.stepLeft}>
                  {isCompleted ? (
                    <View style={[styles.stepIconBox, {backgroundColor: colors.success}]}>
                      <Text style={{color: colors.textInverse, fontSize: fontSize.sm}}>✓</Text>
                    </View>
                  ) : isCurrentStep ? (
                    <Animated.View style={[styles.stepIconBox, {backgroundColor: colors.primary, transform: [{scale: pulseAnim}]}]}>
                      <Text style={{color: colors.textInverse, fontSize: fontSize.sm}}>
                        {STEP_ICONS[step.type]}
                      </Text>
                    </Animated.View>
                  ) : (
                    <View style={[styles.stepIconBox, {backgroundColor: colors.bg}]}>
                      <Text style={{fontSize: fontSize.sm}}>{step.index}</Text>
                    </View>
                  )}
                </View>

                {/* 步骤内容 */}
                <View style={styles.stepContent}>
                  <Text
                    style={{
                      color: isCurrentStep ? colors.primary : colors.textPrimary,
                      fontSize: fontSize.sm,
                      fontWeight: (isCurrentStep ? fontWeight.bold : fontWeight.regular) as any,
                    }}>
                    {step.instruction}
                  </Text>
                  {step.accessibility_note && (
                    <Text style={{color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2}}>
                      {ACCESSIBILITY_COLORS[step.accessibility_level]?.icon} {step.accessibility_note}
                    </Text>
                  )}
                </View>

                {/* 距离 */}
                {step.distance_meters > 0 && (
                  <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
                    {step.distance_meters}m
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* ============================================================ */}
      {/* 6. 底部操作栏 */}
      {/* ============================================================ */}
      <View style={[styles.bottomBar, {backgroundColor: colors.surface, borderTopColor: colors.borderLight}]}>
        {/* 暂停/继续 */}
        <TouchableOpacity
          style={[styles.bottomBtn, {backgroundColor: colors.bg, borderRadius: borderRadius.full}]}
          onPress={() => setIsPaused(!isPaused)}>
          <Text style={{fontSize: 22}}>{isPaused ? '▶️' : '⏸️'}</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize['3xs'], marginTop: 2}}>
            {isPaused ? '继续' : '暂停'}
          </Text>
        </TouchableOpacity>

        {/* SOS 紧急求助 */}
        <TouchableOpacity
          style={[styles.sosBtn, {backgroundColor: colors.danger, borderRadius: borderRadius.full}]}
          onPress={() => {/* TODO: Step 后续 — SOS 流程 */}}>
          <Text style={{color: colors.textInverse, fontSize: fontSize.lg, fontWeight: fontWeight.bold as any}}>
            🆘 SOS
          </Text>
        </TouchableOpacity>

        {/* 结束导航 */}
        <TouchableOpacity
          style={[styles.bottomBtn, {backgroundColor: colors.bg, borderRadius: borderRadius.full}]}
          onPress={() => navigation.goBack()}>
          <Text style={{fontSize: 22}}>🏁</Text>
          <Text style={{color: colors.textSecondary, fontSize: fontSize['3xs'], marginTop: 2}}>
            结束
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** 障碍警告卡片 */
const ObstacleCard: React.FC<{
  obstacle: ObstacleWarning;
  colors: any;
  fontSize: any;
  spacing: any;
  borderRadius: any;
}> = ({obstacle, colors, fontSize, spacing, borderRadius}) => {
  const severityColor = SEVERITY_COLORS[obstacle.severity] || colors.warning;

  return (
    <View
      style={{
        backgroundColor: colors.warningLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: severityColor,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs}}>
        <Text style={{fontSize: fontSize.base, marginRight: spacing.sm}}>{obstacle.icon}</Text>
        <Text style={{color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '600' as any, flex: 1}}>
          {obstacle.description}
        </Text>
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Badge
          text={obstacle.severity === 'critical' ? '严重' : obstacle.severity === 'high' ? '高' : obstacle.severity === 'medium' ? '中' : '低'}
          variant={obstacle.severity === 'critical' || obstacle.severity === 'high' ? 'danger' : 'warning'}
        />
        <Text style={{color: colors.textTertiary, fontSize: fontSize.xs}}>
          前方 {obstacle.distance_ahead_meters}m
        </Text>
      </View>
    </View>
  );
};

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

  // ---- 顶部栏 ----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    marginBottom: 2,
  },

  // ---- 地图区 ----
  mapArea: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  mapRoute: {
    width: '100%',
  },
  mapPoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  mapLabel: {
    flex: 1,
  },
  mapProgressArea: {
    position: 'relative',
    paddingLeft: 5,
    marginVertical: 4,
  },
  currentDot: {
    position: 'absolute',
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapHint: {
    marginTop: 12,
    textAlign: 'center',
  },

  // ---- 当前指令 ----
  currentInstruction: {
    padding: 20,
    marginBottom: 16,
  },
  instructionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    marginBottom: 12,
    lineHeight: 28,
  },
  accessibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  // ---- 到达提示 ----
  arrivedCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },

  // ---- 进度摘要 ----
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  progressItem: {
    alignItems: 'center',
  },

  // ---- 滚动区 ----
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ---- 障碍警告 ----
  obstaclesSection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  obstaclesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },

  // ---- 步骤列表 ----
  stepsSection: {
    marginTop: 20,
  },
  sectionTitle: {},
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
  },
  stepLeft: {
    marginRight: 12,
  },
  stepIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    marginRight: 8,
  },

  // ---- 底部操作栏 ----
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  bottomBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  sosBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default NavigationScreen;

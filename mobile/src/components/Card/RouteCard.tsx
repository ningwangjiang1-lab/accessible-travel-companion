import React from 'react';
import {View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';
import Badge from '../Badge/Badge';

/**
 * RouteCard 路线卡片
 *
 * AI 导航规划页使用（Step 7），展示无障碍路线信息。
 *
 * UI 设计规范：
 * - 推荐路线：绿色边框高亮 (2px solid #10B981)
 * - 无障碍指数：分数显示（绿色≥80 / 橙色<80）
 * - 路线特性标签：✓全程坡道、✓宽通道、⚠窄通道、✕天桥
 * - 路线名称、距离、时间
 */

export interface RouteFeature {
  label: string;
  type: 'positive' | 'warning' | 'negative';
}

export interface RouteCardProps {
  /** 路线名称 */
  name: string;
  /** 无障碍指数 (0-100) */
  accessibilityScore: number;
  /** 距离（如 "1.2km"） */
  distance: string;
  /** 预计时间（如 "15分钟"） */
  duration: string;
  /** 路线特性标签列表 */
  features: RouteFeature[];
  /** 是否为推荐路线 */
  isRecommended?: boolean;
  /** 点击回调 */
  onPress?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const RouteCard: React.FC<RouteCardProps> = ({
  name,
  accessibilityScore,
  distance,
  duration,
  features,
  isRecommended = false,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();

  const scoreColor = accessibilityScore >= 80 ? colors.success : colors.secondary;

  const featureColor = (type: RouteFeature['type']) => {
    switch (type) {
      case 'positive':
        return colors.success;
      case 'warning':
        return colors.secondary;
      case 'negative':
        return colors.danger;
    }
  };

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          borderWidth: isRecommended ? 2 : 1,
          borderColor: isRecommended ? colors.success : colors.borderLight,
          ...shadows.sm.ios,
          elevation: shadows.sm.android.elevation,
          marginBottom: spacing.md,
        },
        style,
      ]}>
      {/* 上方：路线名称 + 无障碍指数 */}
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm}}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold as any,
            flex: 1,
          }}>
          {name}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
          <Text
            style={{
              color: scoreColor,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold as any,
            }}>
            {accessibilityScore}
          </Text>
          <Text style={{color: colors.textTertiary, fontSize: fontSize['4xs'], marginLeft: 2}}>
            分
          </Text>
        </View>
      </View>

      {/* 中间：距离 + 时间 */}
      <View style={{flexDirection: 'row', marginBottom: spacing.sm}}>
        <Text style={{color: colors.textSecondary, fontSize: fontSize.sm}}>
          {distance} · {duration}
        </Text>
      </View>

      {/* 下方：特性标签 */}
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
        {features.map((f, i) => (
          <Badge
            key={i}
            text={f.label}
            variant={
              f.type === 'positive' ? 'success' : f.type === 'warning' ? 'warning' : 'danger'
            }
          />
        ))}
      </View>

      {isRecommended && (
        <View
          style={{
            position: 'absolute',
            top: -1,
            right: spacing.md,
            backgroundColor: colors.success,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderBottomLeftRadius: borderRadius.sm,
            borderBottomRightRadius: borderRadius.sm,
          }}>
          <Text style={{color: colors.textInverse, fontSize: fontSize['3xs'], fontWeight: fontWeight.medium as any}}>
            推荐
          </Text>
        </View>
      )}
    </View>
  );
};

export default RouteCard;

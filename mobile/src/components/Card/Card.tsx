import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * Card 基础组件
 *
 * 2 种变体：
 * - card      标准卡片（白色背景 + 圆角 + 阴影 + 边框）
 * - card-flat 扁平卡片（白色背景 + 圆角 + 边框，无阴影）
 *
 * UI 设计规范：
 * - 背景 #FFFFFF
 * - 圆角 16px
 * - 内边距 16px
 * - 阴影 shadow-sm
 * - 边框 1px solid #F3F4F6
 */

export type CardVariant = 'card' | 'card-flat';

export interface CardProps {
  /** 卡片变体 */
  variant?: CardVariant;
  /** 子元素 */
  children: React.ReactNode;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const Card: React.FC<CardProps> = ({
  variant = 'card',
  children,
  style,
  accessibilityLabel,
}) => {
  const {colors, borderRadius, spacing, shadows} = useTheme();

  const isFlat = variant === 'card-flat';

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    // 阴影（仅 card 变体）
    ...(isFlat ? {} : shadows.sm.ios),
    elevation: isFlat ? 0 : shadows.sm.android.elevation,
    marginBottom: spacing.md,
  };

  return (
    <View style={[cardStyle, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
};

export default Card;

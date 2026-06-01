import React from 'react';
import {View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * Badge 徽标组件
 *
 * 4 种语义色：
 * - primary   蓝色徽标（主色）
 * - success   绿色徽标（成功/正面）
 * - warning   橙色徽标（警告）
 * - danger    红色徽标（危险/负面）
 *
 * UI 设计规范：
 * - 内边距 2px 8px
 * - 圆角 9999px（胶囊形）
 * - 字号 12px
 * - 字重 600
 */

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  /** 徽标文本 */
  text: string;
  /** 语义色变体 */
  variant?: BadgeVariant;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'primary',
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius} = useTheme();

  const variantConfig: Record<BadgeVariant, {bg: string; text: string}> = {
    primary: {bg: colors.primaryLight, text: colors.primary},
    success: {bg: colors.successLight, text: colors.success},
    warning: {bg: colors.warningLight, text: colors.secondaryDark},
    danger: {bg: colors.dangerLight, text: colors.danger},
  };

  const config = variantConfig[variant];

  return (
    <View
      style={[
        {
          backgroundColor: config.bg,
          borderRadius: borderRadius.full,
          paddingVertical: 2,
          paddingHorizontal: 8,
          alignSelf: 'flex-start',
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityRole="text">
      <Text
        style={{
          color: config.text,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold as any,
        }}>
        {text}
      </Text>
    </View>
  );
};

export default Badge;

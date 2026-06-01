import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * QuickAction 快捷操作卡片
 *
 * 2×2 网格中的快捷入口卡片，带图标背景色。
 * 首页 Dashboard 使用。
 *
 * UI 设计规范：
 * - 圆角 16px
 * - 内边距 16px
 * - 图标区域 44px 圆形
 * - hover 上浮 2px + 阴影增强 (translateY + shadow-lg)
 */

export interface QuickActionProps {
  /** emoji 图标 */
  icon: string;
  /** 图标背景色 */
  iconBg: string;
  /** 标题 */
  title: string;
  /** 副标题（选填） */
  subtitle?: string;
  /** 点击回调 */
  onPress?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, spacing, borderRadius, shadows} = useTheme();

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          ...shadows.md.ios,
          elevation: shadows.md.android.elevation,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button">
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 44 / 2,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}>
        <Text style={{fontSize: 22}}>{icon}</Text>
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold as any,
        }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: fontSize.xs,
            marginTop: spacing.xs,
          }}>
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

export default QuickAction;

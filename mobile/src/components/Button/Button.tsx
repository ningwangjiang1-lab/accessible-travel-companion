import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import {useTheme} from '../../theme';

/**
 * Button 组件
 *
 * 5 种变体：
 * - primary   主按钮（蓝色填充）
 * - secondary 次按钮（橙色填充）
 * - outline   描边按钮（蓝色边框+文字）
 * - ghost     幽灵按钮（无边框无背景）
 * - danger    危险按钮（红色填充）
 *
 * 3 种尺寸：
 * - default   默认（padding 10px 20px, fontSize 14px）
 * - lg        大号（padding 14px 28px, fontSize 16px）
 * - block     全宽（width 100% + default 尺寸）
 *
 * UI 设计规范：
 * - 圆角 9999px（胶囊形）
 * - 字重 600
 * - 过渡 all 0.15s ease
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'lg' | 'block';

export interface ButtonProps {
  /** 按钮文本 */
  title: string;
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调 */
  onPress?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 文字样式覆盖 */
  textStyle?: StyleProp<TextStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'default',
  disabled = false,
  onPress,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius} = useTheme();

  // 变体 → 背景色
  const variantBg: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: colors.surface,
    ghost: 'transparent',
    danger: colors.danger,
  };

  // 变体 → 文字色
  const variantText: Record<ButtonVariant, string> = {
    primary: colors.textInverse,
    secondary: colors.textInverse,
    outline: colors.primary,
    ghost: colors.textSecondary,
    danger: colors.textInverse,
  };

  // 变体 → 边框色
  const variantBorder: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: colors.primary,
    ghost: 'transparent',
    danger: colors.danger,
  };

  // 尺寸 → 内边距 + 字号
  const isLg = size === 'lg';
  const isBlock = size === 'block';

  const containerStyle: ViewStyle = {
    backgroundColor: variantBg[variant],
    borderColor: variantBorder[variant],
    borderWidth: variant === 'outline' ? 1.5 : variant === 'ghost' ? 0 : 0,
    borderRadius: borderRadius.full,
    paddingVertical: isLg ? 14 : 10,
    paddingHorizontal: isLg ? 28 : 20,
    width: isBlock ? '100%' : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
  };

  const textStyles: TextStyle = {
    color: variantText[variant],
    fontSize: isLg ? fontSize.base : fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    textAlign: 'center',
  };

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{disabled}}>
      <Text style={[textStyles, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default Button;

import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * ListItem 列表项组件
 *
 * UI 设计规范：
 * - 布局：flex row, align-items center
 * - 内边距 12px 16px
 * - gap 12px
 * - hover 背景 #F9FAFB
 * - 图标：40x40px, 圆角 12px
 * - 标题：16px, 字重 600
 * - 副标题：14px, 颜色 #9CA3AF
 * - 右侧箭头：16px, 颜色 #9CA3AF
 */

export interface ListItemProps {
  /** 左侧图标（emoji 或文字） */
  icon?: string;
  /** 图标背景色 */
  iconBg?: string;
  /** 标题 */
  title: string;
  /** 副标题（选填） */
  subtitle?: string;
  /** 右侧信息文字 */
  rightText?: string;
  /** 是否显示右侧箭头 */
  showArrow?: boolean;
  /** 点击回调 */
  onPress?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const ListItem: React.FC<ListItemProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  rightText,
  showArrow = true,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight} = useTheme();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
      }}>
      {/* 左侧图标 */}
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: iconBg ?? colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{fontSize: 18}}>{icon}</Text>
        </View>
      ) : null}

      {/* 中间文字 */}
      <View style={{flex: 1}}>
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
              fontSize: fontSize.sm,
              marginTop: 2,
            }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 右侧信息 + 箭头 */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
        {rightText ? (
          <Text style={{color: colors.textTertiary, fontSize: fontSize.sm}}>
            {rightText}
          </Text>
        ) : null}
        {showArrow ? (
          <Text style={{color: colors.textTertiary, fontSize: fontSize.base}}>
            ›
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[style]}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button">
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{content}</View>;
};

export default ListItem;

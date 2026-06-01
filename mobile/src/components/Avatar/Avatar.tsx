import React from 'react';
import {View, Text, Image, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * Avatar 头像组件
 *
 * 3 种尺寸：
 * - sm      36px（图标 14px）
 * - default  44px（图标 18px）
 * - lg      56px（图标 20px）
 *
 * UI 设计规范：
 * - 圆角 9999px（圆形）
 * - 背景 #E8F1FB（无图片时）
 * - 文字色 #2B7BD6（无图片时）
 */

export type AvatarSize = 'sm' | 'default' | 'lg';

export interface AvatarProps {
  /** 头像图片 URL */
  uri?: string;
  /** 用户名（取首字显示） */
  name?: string;
  /** 尺寸 */
  size?: AvatarSize;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const sizeConfig: Record<AvatarSize, {width: number; height: number; fontSize: number}> = {
  sm: {width: 36, height: 36, fontSize: 14},
  default: {width: 44, height: 44, fontSize: 18},
  lg: {width: 56, height: 56, fontSize: 20},
};

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 'default',
  style,
  accessibilityLabel,
}) => {
  const {colors, fontWeight} = useTheme();
  const config = sizeConfig[size];
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  const containerStyle: ViewStyle = {
    width: config.width,
    height: config.height,
    borderRadius: config.width / 2,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <View style={[containerStyle, style]} accessibilityLabel={accessibilityLabel ?? name ?? '用户头像'}>
      {uri ? (
        <Image
          source={{uri}}
          style={{width: config.width, height: config.height, borderRadius: config.width / 2}}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={{
            color: colors.primary,
            fontSize: config.fontSize,
            fontWeight: fontWeight.bold as any,
          }}>
          {initials}
        </Text>
      )}
    </View>
  );
};

export default Avatar;

import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * Divider 分割线组件
 *
 * 默认水平分割线 1px #E5E7EB。
 */

export interface DividerProps {
  /** 分割线颜色（默认 #E5E7EB） */
  color?: string;
  /** 分割线粗细（默认 1px） */
  thickness?: number;
  /** 水平内边距 */
  horizontalPadding?: number;
  /** 垂直外边距 */
  verticalMargin?: number;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
}

const Divider: React.FC<DividerProps> = ({
  color,
  thickness = 1,
  horizontalPadding = 0,
  verticalMargin = 0,
  style,
}) => {
  const {colors} = useTheme();

  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: color ?? colors.border,
          marginHorizontal: horizontalPadding,
          marginVertical: verticalMargin,
        },
        style,
      ]}
    />
  );
};

export default Divider;

import React from 'react';
import {View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {useTheme} from '../../theme';

/**
 * ChatBubble 聊天气泡组件
 *
 * 2 种类型：
 * - other   对方消息（左侧灰色气泡）
 * - self    自己消息（右侧蓝色气泡）
 *
 * UI 设计规范：
 * - 内边距 8px 12px
 * - 圆角 16px
 * - 字号 14px
 * - 最大宽度 85%
 * - 对方：bg #F3F4F6, text #111827, 靠左
 * - 自己：bg #2B7BD6, text #FFFFFF, 靠右
 */

export type ChatBubbleType = 'other' | 'self';

export interface ChatBubbleProps {
  /** 消息文本 */
  message: string;
  /** 消息类型 */
  type?: ChatBubbleType;
  /** 时间戳（选填） */
  timestamp?: string;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  type = 'other',
  timestamp,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize} = useTheme();
  const isSelf = type === 'self';

  const bubbleStyle: ViewStyle = {
    backgroundColor: isSelf ? colors.primary : colors.bg,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '85%',
    alignSelf: isSelf ? 'flex-end' : 'flex-start',
  };

  const textColor = isSelf ? colors.textInverse : colors.textPrimary;

  return (
    <View style={[{marginBottom: 8}, style]}>
      <View style={bubbleStyle}>
        <Text
          style={{
            color: textColor,
            fontSize: fontSize.sm,
            lineHeight: 20,
          }}
          accessibilityLabel={accessibilityLabel ?? message}>
          {message}
        </Text>
      </View>
      {timestamp ? (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: fontSize['4xs'],
            alignSelf: isSelf ? 'flex-end' : 'flex-start',
            marginTop: 2,
            marginHorizontal: 4,
          }}>
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
};

export default ChatBubble;

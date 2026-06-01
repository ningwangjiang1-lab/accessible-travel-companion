import React, {useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {useTheme} from '../../theme';

/**
 * SearchInput 搜索输入框
 *
 * UI 设计规范：
 * - 背景 #F3F4F6
 * - 圆角 9999px（胶囊形）
 * - 内边距 12px 16px
 * - 字号 14px
 * - 聚焦态：border #2B7BD6, bg #FFF
 * - 左侧搜索图标 🔍
 */

export interface SearchInputProps {
  /** 输入值 */
  value: string;
  /** 值变化回调 */
  onChangeText: (text: string) => void;
  /** 占位符 */
  placeholder?: string;
  /** 提交回调 */
  onSubmitEditing?: () => void;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder = '搜索...',
  onSubmitEditing,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius} = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isFocused ? colors.surface : colors.bg,
          borderRadius: borderRadius.full,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderWidth: isFocused ? 1.5 : 0,
          borderColor: isFocused ? colors.primary : 'transparent',
        },
        style,
      ]}>
      <Text style={{fontSize: fontSize.sm, marginRight: 8, color: colors.textTertiary}}>
        🔍
      </Text>
      <TextInput
        style={{
          flex: 1,
          color: colors.textPrimary,
          fontSize: fontSize.sm,
          padding: 0,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        autoCorrect={false}
      />
    </View>
  );
};

export default SearchInput;

import React, {useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {useTheme} from '../../theme';

/**
 * FormInput 表单输入框
 *
 * UI 设计规范：
 * - 圆角 12px
 * - 内边距 12px 16px
 * - 边框 1.5px solid #E5E7EB
 * - 字号 14px
 * - 聚焦态：border #2B7BD6
 * - 标签 + 输入框垂直排列
 */

export interface FormInputProps {
  /** 输入值 */
  value: string;
  /** 值变化回调 */
  onChangeText: (text: string) => void;
  /** 表单标签 */
  label?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填（显示红色星号） */
  required?: boolean;
  /** 错误提示信息 */
  error?: string;
  /** 是否多行 */
  multiline?: boolean;
  /** 键盘类型 */
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  /** 最大长度 */
  maxLength?: number;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  required = false,
  error,
  multiline = false,
  keyboardType = 'default',
  maxLength,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius} = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={[{marginBottom: 16}, style]}>
      {/* 标签行 */}
      {label ? (
        <View style={{flexDirection: 'row', marginBottom: 8}}>
          {required ? (
            <Text style={{color: colors.danger, fontSize: fontSize.sm, marginRight: 2}}>
              *
            </Text>
          ) : null}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold as any,
            }}>
            {label}
          </Text>
        </View>
      ) : null}

      {/* 输入框 */}
      <TextInput
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderWidth: 1.5,
          borderColor,
          color: colors.textPrimary,
          fontSize: fontSize.sm,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          opacity: value ? 1 : 0.6,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
      />

      {/* 错误提示 */}
      {error ? (
        <Text
          style={{
            color: colors.danger,
            fontSize: fontSize.xs,
            marginTop: 4,
          }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default FormInput;

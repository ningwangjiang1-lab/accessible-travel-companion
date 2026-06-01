import React from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {useTheme} from '../../theme';
import Button from '../Button/Button';

/**
 * Modal 弹窗组件
 *
 * UI 设计规范：
 * - 遮罩 rgba(0,0,0,0.5)
 * - 内容：bg #FFFFFF, 圆角 20px, 内边距 24px, max-width 340px
 * - 图标 56px
 * - 标题 20px, 字重 800
 * - 描述 14px, 颜色 #4B5563
 * - 点击遮罩可关闭
 */

export interface ModalProps {
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 图标（emoji） */
  icon?: string;
  /** 标题 */
  title?: string;
  /** 描述文字 */
  description?: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 确认按钮变体 */
  confirmVariant?: 'primary' | 'danger';
  /** 确认回调 */
  onConfirm?: () => void;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 自定义内容 */
  children?: React.ReactNode;
  /** 是否允许点击遮罩关闭 */
  closeOnOverlay?: boolean;
  /** 外层样式覆盖 */
  style?: StyleProp<ViewStyle>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  icon,
  title,
  description,
  confirmText,
  confirmVariant = 'primary',
  onConfirm,
  cancelText,
  children,
  closeOnOverlay = true,
  style,
  accessibilityLabel,
}) => {
  const {colors, fontSize, fontWeight, borderRadius, spacing, shadows} = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityLabel={accessibilityLabel ?? title}>
      <TouchableWithoutFeedback onPress={closeOnOverlay ? onClose : undefined}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.xl,
                  padding: 24,
                  maxWidth: 340,
                  width: '85%',
                  alignItems: 'center',
                  ...shadows.xl.ios,
                  elevation: shadows.xl.android.elevation,
                },
                style,
              ]}>
              {/* 图标 */}
              {icon ? (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.dangerLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.lg,
                  }}>
                  <Text style={{fontSize: 28}}>{icon}</Text>
                </View>
              ) : null}

              {/* 标题 */}
              {title ? (
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: fontSize.xl,
                    fontWeight: fontWeight.extrabold as any,
                    textAlign: 'center',
                    marginBottom: spacing.sm,
                  }}>
                  {title}
                </Text>
              ) : null}

              {/* 描述 */}
              {description ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.sm,
                    textAlign: 'center',
                    marginBottom: spacing.xl,
                    lineHeight: 20,
                  }}>
                  {description}
                </Text>
              ) : null}

              {/* 自定义内容 */}
              {children}

              {/* 按钮区 */}
              {(confirmText || cancelText) ? (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    width: '100%',
                  }}>
                  {cancelText ? (
                    <View style={{flex: 1}}>
                      <Button
                        title={cancelText}
                        variant="outline"
                        size="block"
                        onPress={onClose}
                      />
                    </View>
                  ) : null}
                  {confirmText ? (
                    <View style={{flex: 1}}>
                      <Button
                        title={confirmText}
                        variant={confirmVariant}
                        size="block"
                        onPress={onConfirm}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Modal;

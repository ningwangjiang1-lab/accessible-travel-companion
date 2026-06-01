import React, {createContext, useContext} from 'react';
import {colors} from './colors';
import {fontSize, fontWeight, lineHeight, fontFamily} from './typography';
import {spacing} from './spacing';
import {borderRadius} from './borderRadius';
import {shadows} from './shadows';

/**
 * 主题上下文类型
 * 聚合所有 Design Token，通过 useTheme() hook 在任意组件中访问。
 */
export interface Theme {
  colors: typeof colors;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
}

const theme: Theme = {
  colors,
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
  spacing,
  borderRadius,
  shadows,
} as const;

const ThemeContext = createContext<Theme>(theme);

/**
 * ThemeProvider — 将 Design Token 注入 React 组件树
 *
 * 用法：
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

/**
 * useTheme — 在任何组件中获取 Design Token
 *
 * 用法：
 * ```tsx
 * const { colors, spacing } = useTheme();
 * <View style={{ backgroundColor: colors.primary, padding: spacing.lg }} />
 * ```
 */
export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;

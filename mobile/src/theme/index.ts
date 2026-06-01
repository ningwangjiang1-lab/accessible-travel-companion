/**
 * 无障碍出行陪伴平台 — Design Token 统一导出
 *
 * 用法：
 * ```typescript
 * import { colors, spacing, borderRadius, useTheme } from '@/theme';
 * // 或
 * import { colors } from '@/theme/colors';
 * ```
 */

// Design Token 常量
export {colors} from './colors';
export type {ColorTokens} from './colors';

export {fontSize, fontWeight, lineHeight, fontFamily} from './typography';

export {spacing} from './spacing';
export type {SpacingTokens} from './spacing';

export {borderRadius} from './borderRadius';
export type {BorderRadiusTokens} from './borderRadius';

export {shadows} from './shadows';
export type {Shadow, ShadowTokens} from './shadows';

// ThemeProvider 与 Hook
export {ThemeProvider, useTheme} from './ThemeProvider';
export type {Theme} from './ThemeProvider';

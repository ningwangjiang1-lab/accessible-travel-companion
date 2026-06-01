/**
 * 无障碍出行陪伴平台 — 阴影 Design Token
 *
 * 严格对照 UI 设计规范第六章定义（4 级阴影系统）。
 *
 * React Native 阴影实现说明：
 * - iOS: 使用 shadowColor / shadowOffset / shadowOpacity / shadowRadius
 * - Android: 使用 elevation（高度值）
 * - 下方同时提供两种格式
 *
 * | Token   | CSS 值                              | 使用场景                    |
 * |---------|-------------------------------------|----------------------------|
 * | sm      | 0 1px 2px rgba(0,0,0,0.05)         | 卡片、列表、聊天框          |
 * | md      | 0 4px 12px rgba(0,0,0,0.08)        | 快捷操作卡片、地图标记       |
 * | lg      | 0 8px 24px rgba(0,0,0,0.12)        | 位置标记、快捷操作悬停       |
 * | xl      | 0 20px 48px rgba(0,0,0,0.15)       | 模态框、手机框架外壳         |
 */

export interface Shadow {
  /** iOS shadow */
  ios: {
    shadowColor: string;
    shadowOffset: {width: number; height: number};
    shadowOpacity: number;
    shadowRadius: number;
  };
  /** Android elevation */
  android: {
    elevation: number;
  };
}

export const shadows: Record<'sm' | 'md' | 'lg' | 'xl', Shadow> = {
  /** 卡片、列表、聊天框 */
  sm: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  },
  /** 快捷操作卡片、地图标记 */
  md: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  },
  /** 位置标记、快捷操作悬停 */
  lg: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
  },
  /** 模态框、手机框架外壳 */
  xl: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.15,
      shadowRadius: 48,
    },
    android: {
      elevation: 16,
    },
  },
} as const;

export type ShadowTokens = typeof shadows;

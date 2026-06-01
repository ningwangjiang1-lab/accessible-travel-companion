/**
 * 无障碍出行陪伴平台 — 颜色 Design Token
 *
 * 严格对照 UI 设计规范第二章定义。
 * 所有色值来源于 demo.html CSS 自定义属性及 UI 设计规范。
 *
 * 命名约定：
 * - primary      主色（AI/科技 - 可信赖蓝）
 * - secondary    辅助色（人文关怀 - 温暖琥珀色）
 * - success      成功语义色
 * - danger       危险/错误语义色
 * - warning      警告语义色
 * - neutral      中性色（背景/表面/边框）
 * - text         文字色
 * - gradient     渐变色
 */

export const colors = {
  // ========== 主色（AI/科技 - 可信赖蓝）==========
  /** 主按钮、选中标签、链接、进度条 #2B7BD6 */
  primary: '#2B7BD6',
  /** 按钮悬停、深色背景文字 #1E5FAD */
  primaryDark: '#1E5FAD',
  /** 标签背景、选中态背景、头像底色 #E8F1FB */
  primaryLight: '#E8F1FB',
  /** 消息未读背景（极浅蓝）#F0F6FD */
  primary50: '#F0F6FD',

  // ========== 辅助色（人文关怀 - 温暖琥珀色）==========
  /** 真人伴行入口、价格文字、警告态进度条 #F59E0B */
  secondary: '#F59E0B',
  /** 警告态标签文字 #D97706 */
  secondaryDark: '#D97706',
  /** 真人伴行图标背景、环境警告背景 #FFF7ED */
  secondaryLight: '#FFF7ED',

  // ========== 语义色 ==========
  /** 成功、对勾、评分、已匹配、起点标记 #10B981 */
  success: '#10B981',
  /** 成功背景、高分路线 #ECFDF5 */
  successLight: '#ECFDF5',
  /** SOS 按钮、错误、终点标记、必填星号 #EF4444 */
  danger: '#EF4444',
  /** 危险背景、SOS 图标背景、障碍警告 #FEF2F2 */
  dangerLight: '#FEF2F2',
  /** 警告色（同 secondary）#F59E0B */
  warning: '#F59E0B',
  /** 警告背景、振动提示面板 #FFFBEB */
  warningLight: '#FFFBEB',

  // ========== 中性色 ==========
  /** 页面底色、输入框背景、对方聊天气泡 #F3F4F6 */
  bg: '#F3F4F6',
  /** 卡片、导航栏、标签栏、模态框 #FFFFFF */
  surface: '#FFFFFF',
  /** 列表项悬停 #F9FAFB */
  surfaceHover: '#F9FAFB',
  /** 分割线、默认输入框边框、标签栏顶线 #E5E7EB */
  border: '#E5E7EB',
  /** 卡片边框、导航栏底线 #F3F4F6 */
  borderLight: '#F3F4F6',

  // ========== 文字色 ==========
  /** 标题、正文、用户名 #111827 (WCAG AAA 18.4:1) */
  textPrimary: '#111827',
  /** 表单标签、次要信息 #4B5563 (WCAG AA 7.9:1) */
  textSecondary: '#4B5563',
  /** 辅助说明、占位符 #9CA3AF (WCAG AA 3.0:1 @16px+) */
  textTertiary: '#9CA3AF',
  /** 深色/渐变背景上的文字 #FFFFFF */
  textInverse: '#FFFFFF',
  /** 可点击文字链接 #2B7BD6 */
  textLink: '#2B7BD6',

  // ========== 障碍警告专用色 ==========
  /** 障碍警告文字色 #991B1B */
  obstacleText: '#991B1B',

  // ========== 语音面板专用色 ==========
  /** 语音播报关键词高亮 #FCD34D */
  voiceHighlight: '#FCD34D',

  // ========== 遮罩色 ==========
  /** 模态框遮罩 rgba(0,0,0,0.5) */
  modalOverlay: 'rgba(0,0,0,0.5)',

  // ========== Hero 半透明标签 ==========
  /** Hero 区半透明标签背景 rgba(255,255,255,0.2) */
  heroTagBg: 'rgba(255,255,255,0.2)',
} as const;

export type ColorTokens = typeof colors;

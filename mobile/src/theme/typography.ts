/**
 * 无障碍出行陪伴平台 — 字体排版 Design Token
 *
 * 严格对照 UI 设计规范第三章定义。
 * 包含 10 级字号、4 级字重、行高、字体族。
 */

/**
 * 字体族
 * 系统原生字体栈，优先使用 SF Pro (iOS) / Roboto (Android)，
 * 中文字体回退到苹方 / 冬青黑体 / 微软雅黑
 */
export const fontFamily = {
  regular: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
} as const;

/**
 * 字号层级（10 级）
 *
 * | Token    | 大小  | 行高 | 字重 | 使用场景               |
 * |----------|-------|------|------|------------------------|
 * | text3xl  | 30px  | 1.5  | 800  | SOS 倒计时数字         |
 * | text2xl  | 24px  | 1.5  | 800  | 统计数据               |
 * | textXl   | 20px  | 1.5  | 700  | 用户名、评分、模态框标题 |
 * | textLg   | 18px  | 1.5  | 700  | 导航栏标题、无障碍指数   |
 * | textBase | 16px  | 1.5  | 400  | 正文、卡片标题、输入     |
 * | textSm   | 14px  | 1.5  | 400  | 辅助信息、按钮文字       |
 * | textXs   | 12px  | 1.5  | 400  | 标签、时间戳            |
 * | text2xs  | 11px  | 1.5  | 400  | 卡片副标题、路线详情     |
 * | text3xs  | 10px  | 1    | 500  | 标签栏标签              |
 * | text4xs  | 9px   | 1    | 400  | 无障碍指数子标签        |
 */
export const fontSize = {
  /** 30px — SOS 倒计时数字 */
  '3xl': 30,
  /** 24px — 统计数据 */
  '2xl': 24,
  /** 20px — 用户名、评分数字、模态框标题 */
  xl: 20,
  /** 18px — 导航栏标题、无障碍指数 */
  lg: 18,
  /** 16px — 正文、卡片标题、标签、输入 */
  base: 16,
  /** 14px — 辅助信息、按钮文字 */
  sm: 14,
  /** 12px — 标签、时间戳 */
  xs: 12,
  /** 11px — 卡片副标题、路线详情 */
  '2xs': 11,
  /** 10px — 标签栏标签 */
  '3xs': 10,
  /** 9px — 无障碍指数子标签 */
  '4xs': 9,
} as const;

/**
 * 字重
 *
 * | 字重  | 使用场景                                      |
 * |-------|-----------------------------------------------|
 * | 800   | 白色文字标题、SOS 倒计时、统计数据             |
 * | 700   | 导航标题、卡片标题、表单标签、选中标签、按钮    |
 * | 600   | 标签、次要标题、输入文字                        |
 * | 500   | 标签栏未选中、标签选择                          |
 * | 400   | 正文、辅助说明、列表项描述                      |
 */
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/**
 * 行高
 * 大部分文字使用 1.5 行高，小字（9px/10px）使用 1.0
 */
export const lineHeight = {
  /** 1.5 倍行高 — 正文、标题 */
  normal: 1.5,
  /** 1.0 倍行高 — 极小文字 */
  tight: 1.0,
} as const;

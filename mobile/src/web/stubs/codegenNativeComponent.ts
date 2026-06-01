/**
 * Stub: react-native/Libraries/Utilities/codegenNativeComponent
 *
 * Web 上无原生代码生成，提供兼容的空实现。
 */

// 返回一个空的组件类型
export default function codegenNativeComponent<Props>(
  _name: string,
  _options?: any,
): React.ComponentType<Props> {
  // 在 Web 上返回一个简单的 View 替代
  const {View} = require('react-native');
  return View as any;
}

// 命名导出 — 某些库使用
export const UnsafeMixedPropTypes = {};

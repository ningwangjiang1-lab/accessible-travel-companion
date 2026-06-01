/**
 * Web 平台 Stub 文件 — 替换 React Native 中不支持 Web 的 API
 *
 * 这些模块在浏览器中没有对应的实现，
 * 提供空实现防止编译错误。
 */

// StatusBar — 浏览器无状态栏概念
export const StatusBar = {
  setBarStyle: () => {},
  setHidden: () => {},
  setBackgroundColor: () => {},
  currentHeight: 0,
};

// Vibration — 浏览器不支持振动
export const Vibration = {
  vibrate: () => {},
  cancel: () => {},
};

// Platform — 返回 Web 平台信息
export const Platform = {
  OS: 'web',
  Version: '',
  select: (obj: any) => obj.web ?? obj.default,
};

// NativeModules — 空对象
export const NativeModules = {};

// AppState — 简单实现
export const AppState = {
  currentState: 'active' as const,
  addEventListener: () => ({remove: () => {}}),
  removeEventListener: () => {},
};

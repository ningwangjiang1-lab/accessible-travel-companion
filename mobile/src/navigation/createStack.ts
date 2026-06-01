/**
 * 跨平台 Stack Navigator 创建器
 *
 * 本文件为 Web 平台版本（Vite）。
 * 原生平台（Metro）使用 createStack.native.ts。
 *
 * Web：使用 WebStack（View-based 导航）
 * 原生：使用 @react-navigation/native-stack
 */

export {createWebStackNavigator as default} from './WebStack';

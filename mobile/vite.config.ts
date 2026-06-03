import {defineConfig, Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rnw = path.resolve(__dirname, 'node_modules/react-native-web');

/**
 * Vite 插件：处理 react-native-web 不存在的内部路径
 */
function rnWebPlugin(): Plugin {
  const stubMap: Record<string, string> = {
    'react-native/Libraries/Utilities/codegenNativeComponent':
      path.resolve(__dirname, 'src/web/stubs/codegenNativeComponent.js'),
    'react-native/Libraries/ReactNative/AppContainer':
      path.resolve(__dirname, 'src/web/stubs/AppContainer.tsx'),
  };

  return {
    name: 'rn-web-compat',
    enforce: 'pre',
    resolveId(id, importer) {
      if (stubMap[id]) return stubMap[id];
      if (id.endsWith('codegenNativeComponent') && importer?.includes('react-native-safe-area-context')) {
        return stubMap['react-native/Libraries/Utilities/codegenNativeComponent'];
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [rnWebPlugin(), react()],

  resolve: {
    alias: {
      'react-native': rnw,
      // 使用增强版 mock，基于真实的 react-native-screens .web.js
      'react-native-screens': path.resolve(__dirname, 'src/web/mocks/react-native-screens.ts'),
    },
    conditions: ['browser', 'module', 'import', 'default'],
  },

  // 关键：排除原生库的预构建，避免 resolveId 插件不生效
  optimizeDeps: {
    exclude: [
      'react-native-screens',
      'react-native-safe-area-context',
    ],
  },

  server: {
    port: 8080,
    open: true,
  },

  // GitHub Pages 部署路径（自定义域名时改为 '/'）
  base: process.env.CI ? '/accessible-travel-companion/' : '/',

  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
  },
});

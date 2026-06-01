import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API 客户端配置
 *
 * - baseURL：后端地址（开发环境）
 * - 自动附加 JWT Bearer token
 * - 401 时自动清除 token
 */

const STORAGE_KEY_TOKEN = '@accessible_travel_token';

// 开发环境：浏览器 & iOS 模拟器用 localhost，Android 模拟器用 10.0.2.2
// 当前运行在 Web 上，使用 localhost
export const API_BASE_URL = 'http://localhost:3000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器：自动附加 JWT token
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

/**
 * 响应拦截器：401 → 清除 token
 */
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
    }
    return Promise.reject(error);
  },
);

export {STORAGE_KEY_TOKEN};
export default api;

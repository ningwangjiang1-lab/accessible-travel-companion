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

// API 地址：通过环境变量配置，开发默认 localhost
// 生产环境自动指向 Railway 后端
export const API_BASE_URL =
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://impartial-caring-production-3593.up.railway.app/api'
    : null)
  || import.meta.env.VITE_API_URL
  || 'http://localhost:3000/api';

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

import {create} from 'zustand';
import * as authService from '../services/authService';

/**
 * Auth Store — Zustand 状态管理
 *
 * 管理认证状态：用户信息、token、登录态。
 *
 * 状态流转：
 * - 未登录：user=null, token=null, isLoggedIn=false
 * - 已登录：user=User, token=string, isLoggedIn=true
 * - 加载中：isLoading=true（App 启动时检查 token）
 */

export interface AuthState {
  // ---- 状态 ----
  user: authService.User | null;
  profile: authService.DisabilityProfile | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  // ---- 操作 ----
  /** 注册 */
  register: (input: authService.RegisterInput) => Promise<void>;
  /** 登录 */
  login: (phone: string, code: string) => Promise<void>;
  /** 发送验证码 */
  sendCode: (phone: string) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 恢复登录态（App 启动时调用） */
  restoreSession: () => Promise<void>;
  /** 更新用户画像 */
  updateProfile: (input: Partial<authService.RegisterInput>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,

  sendCode: async (phone: string) => {
    await authService.sendVerificationCode(phone);
  },

  register: async (input: authService.RegisterInput) => {
    const result = await authService.register(input);
    set({
      user: result.user,
      profile: result.profile,
      token: result.token,
      isLoggedIn: true,
    });
  },

  login: async (phone: string, code: string) => {
    const result = await authService.login(phone, code);
    set({
      user: result.user,
      profile: result.profile,
      token: result.token,
      isLoggedIn: true,
    });
  },

  logout: async () => {
    await authService.logout();
    set({
      user: null,
      profile: null,
      token: null,
      isLoggedIn: false,
    });
  },

  restoreSession: async () => {
    try {
      const token = await authService.getStoredToken();
      if (token) {
        const {user, profile} = await authService.getCurrentUser();
        set({
          user,
          profile,
          token,
          isLoggedIn: true,
          isLoading: false,
        });
      } else {
        set({isLoading: false});
      }
    } catch {
      // Token 过期或网络不可达
      await authService.logout();
      set({
        user: null,
        profile: null,
        token: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
  },

  updateProfile: async (input: Partial<authService.RegisterInput>) => {
    const {user, profile} = await authService.updateProfile(input);
    set({user, profile});
  },
}));

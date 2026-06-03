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

/** 使用模式：出行（叫服务）/ 服务（接单） */
export type AppMode = 'passenger' | 'service';

export interface AuthState {
  // ---- 状态 ----
  user: authService.User | null;
  profile: authService.DisabilityProfile | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  /** 当前使用模式 */
  mode: AppMode;

  // ---- 操作 ----
  register: (input: authService.RegisterInput) => Promise<void>;
  login: (phone: string, code: string) => Promise<void>;
  sendCode: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateProfile: (input: Partial<authService.RegisterInput>) => Promise<void>;
  /** 切换出行/服务模式 */
  switchMode: (mode: AppMode) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  mode: 'passenger',

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

  switchMode: (mode: AppMode) => {
    set({mode});
  },
}));

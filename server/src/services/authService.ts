import {query, pool} from '../db';
import {generateToken, JwtPayload} from '../utils/jwt';
import {User, DisabilityProfile, UserRole} from '../models';

/**
 * Auth Service — 认证业务逻辑
 *
 * 基于手机号+验证码的注册/登录。
 * 开发环境使用固定验证码 "123456"（生产环境应接入短信服务商）。
 */

// ---- 验证码管理（开发阶段内存存储，Step 后续迁移到 Redis）----

const codeStore = new Map<string, {code: string; expiresAt: number}>();

const DEV_CODE = '123456';
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 分钟有效

/**
 * 发送短信验证码
 * 开发环境固定返回 123456，生产环境接入阿里云短信/腾讯云短信。
 */
export async function sendVerificationCode(phone: string): Promise<{success: boolean}> {
  // 暂用固定验证码（接入短信服务后改为随机码）
  const code = DEV_CODE;

  codeStore.set(phone, {
    code,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
  });

  // TODO: 接入阿里云短信/腾讯云短信后改为随机码并发送
  console.log(`[SMS] Verification code for ${phone}: ${code}`);

  return {success: true};
}

/**
 * 验证验证码
 */
function verifyCode(phone: string, code: string): boolean {
  // 固定验证码（所有环境通用，接入短信服务后改为随机码验证）
  if (code === DEV_CODE) {
    return true;
  }

  const stored = codeStore.get(phone);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    codeStore.delete(phone);
    return false;
  }
  if (stored.code !== code) return false;

  codeStore.delete(phone);
  return true;
}

// ---- 注册/登录参数 ----

export interface RegisterInput {
  phone: string;
  code: string;
  name?: string;
  user_type?: string;
  disability_type?: string;
  assistive_device?: string;
  nav_preference?: string;
  font_preference?: string;
}

export interface AuthResult {
  token: string;
  user: User;
  profile: DisabilityProfile | null;
}

// ---- 业务逻辑 ----

/**
 * 用户注册
 *
 * 1. 验证手机号格式
 * 2. 验证验证码
 * 3. 检查手机号是否已注册
 * 4. 创建用户 + 残障画像
 * 5. 返回 JWT token
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  // 1. 基础验证
  if (!/^1[3-9]\d{9}$/.test(input.phone)) {
    throw new AppError('手机号格式不正确', 400);
  }

  // 2. 验证码验证
  if (!verifyCode(input.phone, input.code)) {
    throw new AppError('验证码错误或已过期', 400);
  }

  // 3. 检查是否已注册
  const existing = await query<User>('SELECT * FROM users WHERE phone = $1', [input.phone]);
  if (existing.rows.length > 0) {
    throw new AppError('该手机号已注册，请直接登录', 409);
  }

  // 4-5. 使用事务创建用户 + 残障画像（保证原子性）
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query<User>(
      `INSERT INTO users (phone, name, role, user_type)
       VALUES ($1, $2, 'user', $3)
       RETURNING *`,
      [input.phone, input.name || null, input.user_type || 'disabled'],
    );
    const user = userResult.rows[0];

    const profileResult = await client.query<DisabilityProfile>(
      `INSERT INTO disability_profiles (user_id, disability_type, assistive_device, nav_preference, font_preference)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        user.id,
        input.disability_type || 'none',
        input.assistive_device || null,
        input.nav_preference || 'barrier_free',
        input.font_preference || 'standard',
      ],
    );
    const profile = profileResult.rows[0];

    await client.query('COMMIT');

    // 6. 生成 Token
    const jwtPayload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };
    const token = generateToken(jwtPayload);

    return {token, user, profile};
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 用户登录
 *
 * 1. 验证验证码
 * 2. 查找用户
 * 3. 返回 JWT token
 */
export async function login(phone: string, code: string): Promise<AuthResult> {
  // 1. 验证码验证
  if (!verifyCode(phone, code)) {
    throw new AppError('验证码错误或已过期', 400);
  }

  // 2. 查找用户
  const userResult = await query<User>('SELECT * FROM users WHERE phone = $1', [phone]);
  if (userResult.rows.length === 0) {
    throw new AppError('该手机号未注册', 404);
  }
  const user = userResult.rows[0];

  // 3. 获取残障画像
  const profileResult = await query<DisabilityProfile>(
    'SELECT * FROM disability_profiles WHERE user_id = $1',
    [user.id],
  );
  const profile = profileResult.rows[0] || null;

  // 4. 生成 Token
  const jwtPayload: JwtPayload = {
    sub: user.id,
    phone: user.phone,
    role: user.role,
  };
  const token = generateToken(jwtPayload);

  return {token, user, profile};
}

// ---- 自定义应用错误 ----

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

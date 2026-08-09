const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

export function validateEnvironment(): void {
  const missing = REQUIRED.filter(key => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      const value = process.env[key] || '';
      if (value.length < 32 || /change|your-|secret-key/i.test(value)) {
        throw new Error(`${key} phải là chuỗi ngẫu nhiên tối thiểu 32 ký tự trong production`);
      }
    }
    if (!process.env.CORS_ORIGIN) {
      throw new Error('CORS_ORIGIN bắt buộc trong production');
    }
  }
}

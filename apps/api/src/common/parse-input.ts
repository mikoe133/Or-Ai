import type { ApiErrorCode } from '@orai/contracts';
import { ApiException } from './http-errors';

export function parseInput<T>(schema: {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}, value: unknown, code: ApiErrorCode = 'VALIDATION_ERROR'): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiException(code, code === 'INVALID_CONFIGURATION'
    ? '商品配置不符合题目、计分或报告规则' : '提交内容格式不正确', 400);
  return result.data;
}

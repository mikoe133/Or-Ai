export class AuthFlowError extends Error {
  constructor(readonly code: string, message: string, readonly retryAfterSeconds = 0) { super(message); }
}

export function providerFailure(error: { code?: string; status?: number } | null): AuthFlowError {
  if (error?.status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(error?.code ?? '')) {
    return new AuthFlowError('RATE_LIMITED', '操作太频繁，请稍后再试。', 60);
  }
  if (error?.code === 'invalid_credentials') return new AuthFlowError('INVALID_CREDENTIALS', '邮箱或密码不正确。');
  if (error?.code === 'email_not_confirmed') return new AuthFlowError('EMAIL_UNVERIFIED', '请先在邮件中验证邮箱，再登录。');
  if (['weak_password', 'same_password'].includes(error?.code ?? '')) return new AuthFlowError('INVALID_INPUT', '请使用更长且不同于原密码的新密码。');
  if (['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'bad_code_verifier', 'pkce_code_verifier_not_found'].includes(error?.code ?? '')) return invalidCallback();
  return new AuthFlowError('SERVICE_UNAVAILABLE', '账户服务暂时不可用，请稍后重试。');
}
export function invalidCallback() {
  return new AuthFlowError('CALLBACK_INVALID', '验证链接已失效。请用发起申请的浏览器打开邮件，或重新申请。');
}

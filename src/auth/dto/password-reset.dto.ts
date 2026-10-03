// These endpoints had no request validators in the Express app; the service
// coerces the values itself, so they are typed as plain interfaces (not validated).
export interface ForgotPasswordBody {
  email?: string;
}

export interface VerifyResetCodeBody {
  resetCode?: string;
}

export interface ResetPasswordBody {
  email?: string;
  newPassword?: string;
}

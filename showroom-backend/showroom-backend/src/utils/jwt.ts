import jwt, { type SignOptions } from 'jsonwebtoken';

function tokenExpiry(value: string | undefined, fallback: string): SignOptions['expiresIn'] {
  return (value || fallback) as SignOptions['expiresIn'];
}

export interface JwtPayload {
  user_id: string;
  role: string;
  branch_id?: string | null;
}

export interface RefreshJwtPayload extends JwtPayload {
  jti: string;
}

export interface ChatSessionPayload {
  session_id: string;
}

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: tokenExpiry(process.env.JWT_EXPIRES_IN, '15m'),
  });
};

export const signRefreshToken = (payload: RefreshJwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: tokenExpiry(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
};

export const verifyRefreshToken = (token: string): RefreshJwtPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as RefreshJwtPayload;
};

export const signChatSessionToken = (session_id: string): string => {
  return jwt.sign({ session_id }, process.env.JWT_SECRET as string, {
    audience: 'chat-session',
    expiresIn: '30d',
  });
};

export const verifyChatSessionToken = (token: string): ChatSessionPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string, {
    audience: 'chat-session',
  }) as ChatSessionPayload;
};

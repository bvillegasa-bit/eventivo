declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      rol: string;
      tipo: string;
      iat?: number;
      exp?: number;
      jti?: string;
    };
  }
}
export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials?: string;
  currency?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

/** Resposta bruta da API — normalizada em auth.service.ts */
export interface RawAuthResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: RawUser;
  data?: {
    token?: string;
    accessToken?: string;
    access_token?: string;
    user?: RawUser;
  };
}

export interface RawUser {
  id?: string | number;
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  currency?: string;
  avatarInitials?: string;
}

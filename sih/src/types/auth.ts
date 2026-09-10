export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  googleId?: string | null;
  authProvider: 'local' | 'google';
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface GoogleAuthPayload {
  idToken?: string;
  accessToken?: string;
  userInfo?: {
    id?: string;
    email: string;
    name?: string;
    photo?: string;
    picture?: string;
  };
}

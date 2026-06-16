import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  authToken: string;
  refreshToken: string;
  statusCode: number;
  user: AuthUser;
}

export interface AuthRestaurant {
  id: string;
  name: string;
  address: string;
  city: string | null;
  type: string;
  reservationEnabled: boolean;
  imagePath: string | null;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: {
    id: string;
    name: string;
  };
  restaurant: AuthRestaurant | null;
}

export interface UserInfoResponse {
  status: number;
  user: AuthUser;
  token: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface RolesResponse {
  status: number;
  roles: Role[];
}

export interface SignupRestaurantPayload {
  name: string;
  city: string;
  address?: string;
  type: 'FIXE' | 'ITINERANT';
  reservationEnabled: boolean;
  googleMapsUrl?: string;
}

export interface SignupPayload {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    password1: string;
    roleId: string;
    phone?: string;
  };
  restaurant: SignupRestaurantPayload;
}

export interface SignupResponse {
  token: string;
  statutCode: number;
  message: string;
  referralValid?: boolean;
}

export interface VerifyEmailOtpPayload {
  token: string;
  code: string;
  type: 'VERIFYEMAIL';
}

export interface ResendOtpPayload {
  email: string;
  type: 'VERIFYEMAIL';
}

export interface ResendOtpResponse {
  status: number;
  token: string;
  message: string;
}

const AUTH_TOKEN_KEY = 'pdj_auth_token';
const REFRESH_TOKEN_KEY = 'pdj_refresh_token';
const USER_KEY = 'pdj_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<AuthUser | null>(null);
  private isLoading = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role?.name || null);
  readonly isAdmin = computed(() => this.userRole() === 'ADMIN');
  readonly isRestaurant = computed(() => this.userRole() === 'RESTAURANT');
  readonly restaurantId = computed(() => this.currentUser()?.restaurant?.id || null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadStoredUser();
    // Re-fetch fresh user info on app reload if already authenticated
    if (this.getAuthToken()) {
      this.fetchAndStoreUserInfo().subscribe();
    }
  }

  login(credentials: LoginRequest): Observable<UserInfoResponse> {
    this.isLoading.set(true);

    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        this.storeTokens(response.authToken, response.refreshToken);
      }),
      // After storing tokens, fetch the full user info (including restaurant)
      switchMap(() => this.fetchAndStoreUserInfo()),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Fetches the full user info from GET /users/me/infos.
   * This mirrors the mobile's pattern of calling this endpoint after login
   * to get the complete user object including the restaurant relation.
   */
  fetchAndStoreUserInfo(): Observable<UserInfoResponse> {
    return this.http.get<UserInfoResponse>(`${environment.apiUrl}/users/me/infos`).pipe(
      tap((response) => {
        this.storeUser(response.user);
        this.currentUser.set(response.user);
      }),
      catchError((error) => {
        console.error('[AuthService] Failed to fetch user info:', error);
        return throwError(() => error);
      }),
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    const authToken = this.getAuthToken();

    if (authToken && refreshToken) {
      this.http
        .post(
          `${environment.apiUrl}/auth/logout`,
          { token: refreshToken },
          { headers: { Authorization: `Bearer ${authToken}` } },
        )
        .subscribe({
          error: () => {
            // Logout from server failed, still clear local state
          },
        });
    }

    this.clearStorage();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getRoles(): Observable<RolesResponse> {
    return this.http.get<RolesResponse>(`${environment.apiUrl}/roles`);
  }

  signup(payload: SignupPayload): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${environment.apiUrl}/auth/signup`, payload);
  }

  verifyEmailOtp(payload: VerifyEmailOtpPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/verify-otp`, payload);
  }

  resendSignupOtp(payload: ResendOtpPayload): Observable<ResendOtpResponse> {
    return this.http.post<ResendOtpResponse>(`${environment.apiUrl}/auth/send-otp`, payload);
  }

  completeSignupAfterOtp(response: LoginResponse): Observable<UserInfoResponse> {
    this.storeTokens(response.authToken, response.refreshToken);
    return this.fetchAndStoreUserInfo();
  }

  refreshTokens(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/refresh/tokens`, {
        token: refreshToken,
      })
      .pipe(
        tap((response) => {
          this.storeTokens(response.authToken, response.refreshToken);
        }),
      );
  }

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    return this.currentUser();
  }

  getRestaurantId(): string | null {
    return this.currentUser()?.restaurant?.id || null;
  }

  private storeTokens(authToken: string, refreshToken: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  private storeUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        this.currentUser.set(JSON.parse(storedUser));
      } catch {
        this.clearStorage();
      }
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

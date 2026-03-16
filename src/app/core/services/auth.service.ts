import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  authToken: string;
  refreshToken: string;
  user: AuthUser;
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
  restaurant?: {
    id: string;
    name: string;
  };
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
  readonly isAdmin = computed(() => this.currentUser()?.role?.name === 'ADMIN');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadStoredUser();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoading.set(true);

    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        this.storeTokens(response.authToken, response.refreshToken);
        this.storeUser(response.user);
        this.currentUser.set(response.user);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
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

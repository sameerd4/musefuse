import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface LoginResponse {
  error: boolean;
  token: string;
  expiresIn: number;  // seconds until expiration
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenExpirationTimer: any;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check token on startup
    this.checkToken();
  }

  private checkToken() {
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();

        if (expirationTime > now) {
          // Token is still valid
          this.isAuthenticatedSubject.next(true);
          
          // Set up expiration timer
          this.setTokenExpirationTimer(expirationTime - now);
        } else {
          // Token has expired
          this.logout();
        }
      } catch {
        // Invalid token
        this.logout();
      }
    }
  }

  private setTokenExpirationTimer(duration: number) {
    // Clear any existing timer
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    // Set new timer
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, duration);
  }

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/register`, { username, password });
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          if (!response.error && response.token) {
            localStorage.setItem('token', response.token);
            this.isAuthenticatedSubject.next(true);
            
            // Set up expiration timer
            this.setTokenExpirationTimer(response.expiresIn * 1000);
          }
        })
      );
  }

  refreshToken(): Observable<boolean> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/refresh-token`, {})
      .pipe(
        map(response => {
          if (!response.error && response.token) {
            localStorage.setItem('token', response.token);
            this.setTokenExpirationTimer(response.expiresIn * 1000);
            return true;
          }
          return false;
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.isAuthenticatedSubject.next(false);
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }
} 
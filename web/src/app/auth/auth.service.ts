import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject, Observable, tap } from 'rxjs'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string | null
  role: string | null
  mustChangePassword: boolean
}

interface LoginResponse {
  message: string
  data: {
    user: User
  }
}

interface MeResponse {
  data: {
    user: User
  }
}

interface RegisterData {
  email: string;
  password: string;
  password_confirmation: string;
  firstName: string;
  lastName?: string;
  empId: number;
  mgrId: number;
  approleId?: number;
  fnroleId?: number;
}

interface RegisterResponse {
  message: string;
  data: {
    user: User;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null)
  public currentUser$ = this.currentUserSubject.asObservable()

  constructor(private http: HttpClient) {
    this.checkAuth()
  }

  login(email: string, password: string, rememberMe: boolean = false): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password, rememberMe }).pipe(
      tap(response => {
        this.currentUserSubject.next(response.data.user)
      })
    )
  }

  register(data: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', data);
  }

  logout(): Observable<any> {
    return this.http.post('/api/auth/logout', {}).pipe(
      tap(() => {
        this.currentUserSubject.next(null)
      })
    )
  }

  checkAuth(): void {
    this.http.get<MeResponse>('/api/auth/me').subscribe({
      next: (response) => {
        this.currentUserSubject.next(response.data.user)
      },
      error: () => {
        this.currentUserSubject.next(null)
      }
    })
  }

  changePassword(currentPassword: string, newPassword: string, newPasswordConfirmation: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/change-password', {
      currentPassword,
      newPassword,
      newPassword_confirmation: newPasswordConfirmation,
    }).pipe(
      tap(() => {
        const user = this.currentUserSubject.value
        if (user) {
          this.currentUserSubject.next({ ...user, mustChangePassword: false })
        }
      })
    )
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value
  }

  isSysAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'sys_admin'
  }

  isOrgAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'org_admin'
  }

  needsPasswordChange(): boolean {
    return this.currentUserSubject.value?.mustChangePassword === true
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/forgot-password', { email })
  }

  resetPassword(
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/reset-password', {
      email,
      token,
      password,
      password_confirmation: passwordConfirmation,
    })
  }
}

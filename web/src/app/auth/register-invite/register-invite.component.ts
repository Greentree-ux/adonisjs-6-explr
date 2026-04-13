import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { HttpClient } from '@angular/common/http'
import { AuthService } from '../auth.service'

interface InviteData {
  email: string
  firstName: string | null
  lastName: string | null
  empId: number | null
}

@Component({
  selector: 'app-register-invite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="register-container">
      <div class="register-card">
        <h2>Complete Your Registration</h2>

        <!-- Loading / Error states -->
        <div *ngIf="validating" class="info-text">Validating your invitation...</div>
        <div *ngIf="tokenError" class="alert error">{{ tokenError }}</div>

        <!-- Success state -->
        <div *ngIf="registered" class="alert success">
          {{ successMessage }}
          <p>Redirecting to login...</p>
        </div>

        <!-- Registration form -->
        <form *ngIf="inviteData && !registered" (ngSubmit)="onSubmit()">
          <div class="alert error" *ngIf="formError">{{ formError }}</div>

          <div class="form-group">
            <label>Employee ID</label>
            <input type="text" [value]="inviteData.empId" disabled class="readonly-field" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>First Name</label>
              <input type="text" [value]="inviteData.firstName" disabled class="readonly-field" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" [value]="inviteData.lastName" disabled class="readonly-field" />
            </div>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" [value]="inviteData.email" disabled class="readonly-field" />
          </div>

          <div class="form-group">
            <label for="password">Password *</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="8"
              placeholder="Enter your password"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              required
              placeholder="Re-enter your password"
            />
          </div>

          <div class="password-requirements">
            <p><strong>Password requirements:</strong></p>
            <ul>
              <li [class.met]="password.length >= 8">At least 8 characters</li>
              <li [class.met]="password === confirmPassword && password.length > 0">Passwords match</li>
            </ul>
          </div>

          <button type="submit" [disabled]="loading" class="btn-primary">
            {{ loading ? 'Registering...' : 'Register' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
    }
    .register-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 480px;
    }
    h2 { margin: 0 0 1.5rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .form-group { flex: 1; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .form-group input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .readonly-field {
      background-color: #f5f5f5;
      color: #555;
    }
    .password-requirements {
      background: #f9f9f9;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.85rem;
    }
    .password-requirements p { margin: 0 0 0.25rem; }
    .password-requirements ul { margin: 0; padding-left: 1.25rem; }
    .password-requirements li { color: #c00; }
    .password-requirements li.met { color: #060; }
    .btn-primary {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .info-text { color: #666; margin-bottom: 1rem; }
  `]
})
export class RegisterInviteComponent implements OnInit {
  token = ''
  inviteData: InviteData | null = null
  password = ''
  confirmPassword = ''
  validating = true
  tokenError: string | null = null
  formError: string | null = null
  loading = false
  registered = false
  successMessage = ''

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || ''
    if (!this.token) {
      this.validating = false
      this.tokenError = 'No invitation token provided. Please use the link from your invitation email.'
      return
    }

    this.http.get<{ data: InviteData }>(`/api/auth/validate-invite?token=${this.token}`).subscribe({
      next: (res) => {
        this.inviteData = res.data
        this.validating = false
      },
      error: (err) => {
        this.tokenError = err.error?.message || 'Invalid or expired invitation token.'
        this.validating = false
      }
    })
  }

  onSubmit(): void {
    this.formError = null

    if (this.password.length < 8) {
      this.formError = 'Password must be at least 8 characters'
      return
    }

    if (this.password !== this.confirmPassword) {
      this.formError = 'Passwords do not match'
      return
    }

    this.loading = true

    this.http.post<{ message: string }>('/api/auth/register-invite', {
      token: this.token,
      password: this.password,
      password_confirmation: this.confirmPassword,
    }).subscribe({
      next: (res) => {
        this.registered = true
        this.successMessage = res.message

        // Logout (in case there's an active session) and redirect to login
        this.authService.logout().subscribe({
          complete: () => {
            setTimeout(() => this.router.navigate(['/login']), 3000)
          },
          error: () => {
            setTimeout(() => this.router.navigate(['/login']), 3000)
          }
        })
      },
      error: (err) => {
        this.formError = err.error?.message || 'Registration failed. Please try again.'
        this.loading = false
      }
    })
  }
}

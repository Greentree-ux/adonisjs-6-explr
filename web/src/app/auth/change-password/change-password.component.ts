import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="change-password-container">
      <div class="change-password-card">
        <h2>Change Your Password</h2>
        <p class="info-text">You must change your password before continuing.</p>

        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input type="password" id="currentPassword" [(ngModel)]="currentPassword" name="currentPassword" required />
          </div>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" [(ngModel)]="newPassword" name="newPassword" required minlength="8" />
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input type="password" id="confirmPassword" [(ngModel)]="confirmPassword" name="confirmPassword" required />
          </div>
          <button type="submit" [disabled]="loading" class="btn-primary">
            {{ loading ? 'Changing...' : 'Change Password' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .change-password-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
    }
    .change-password-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }
    h2 { margin: 0 0 0.5rem; }
    .info-text { color: #666; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .form-group input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
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
  `]
})
export class ChangePasswordComponent {
  currentPassword = ''
  newPassword = ''
  confirmPassword = ''
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = null
    this.success = null

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'New passwords do not match'
      return
    }

    if (this.newPassword.length < 8) {
      this.error = 'New password must be at least 8 characters'
      return
    }

    this.loading = true
    this.authService.changePassword(this.currentPassword, this.newPassword, this.confirmPassword).subscribe({
      next: () => {
        this.success = 'Password changed successfully. Redirecting...'
        setTimeout(() => {
          const user = this.authService.getCurrentUser()
          if (user?.role === 'sys_admin') {
            this.router.navigate(['/sysadmin'])
          } else if (user?.role === 'org_admin') {
            this.router.navigate(['/orgadmin/emp-data'])
          } else {
            this.router.navigate(['/fnfnroles'])
          }
        }, 1500)
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to change password'
        this.loading = false
      }
    })
  }
}

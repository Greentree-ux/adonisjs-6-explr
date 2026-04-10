import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  email = ''
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    if (!this.email) {
      this.error = 'Please enter your email address'
      return
    }

    this.loading = true
    this.error = null
    this.success = null

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.success = response.message
        this.loading = false
        this.email = ''
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred. Please try again.'
        this.loading = false
      },
    })
  }
}

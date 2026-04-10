import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  email = ''
  password = ''
  confirmPassword = ''
  firstName = ''
  lastName = ''
  empId: number | null = null
  mgrId: number | null = null
  approleId: number | null = null
  fnroleId: number | null = null
  
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    // Reset messages
    this.error = null
    this.success = null

    // Validation
    if (!this.email || !this.password || !this.firstName || !this.empId || !this.mgrId) {
      this.error = 'Please fill in all required fields'
      return
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters'
      return
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match'
      return
    }

    this.loading = true

    const userData = {
      email: this.email,
      password: this.password,
      password_confirmation: this.confirmPassword,
      firstName: this.firstName,
      lastName: this.lastName || undefined,
      empId: this.empId,
      mgrId: this.mgrId,
      approleId: this.approleId || undefined,
      fnroleId: this.fnroleId || undefined
    }

    this.authService.register(userData).subscribe({
      next: () => {
        this.success = 'Registration successful! Redirecting to login...'
        setTimeout(() => {
          this.router.navigate(['/login'])
        }, 2000)
      },
      error: (err) => {
        // Only show generic user-friendly error messages
        // Log detailed errors to console for debugging
        console.error('Registration error:', err)
        this.error = 'Registration failed. Please check your information and try again.'
        this.loading = false
      }
    })
  }
}

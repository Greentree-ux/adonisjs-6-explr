import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink, ActivatedRoute } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  email = ''
  token = ''
  password = ''
  passwordConfirmation = ''
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || ''
      this.token = params['token'] || ''

      if (!this.email || !this.token) {
        this.error = 'Invalid password reset link. Please request a new one.'
      }
    })
  }

  onSubmit(): void {
    this.error = null

    if (!this.password || !this.passwordConfirmation) {
      this.error = 'Please fill in all fields'
      return
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters'
      return
    }

    if (this.password !== this.passwordConfirmation) {
      this.error = 'Passwords do not match'
      return
    }

    this.loading = true

    this.authService
      .resetPassword(this.email, this.token, this.password, this.passwordConfirmation)
      .subscribe({
        next: (response) => {
          this.success = response.message
          this.loading = false
          setTimeout(() => {
            this.router.navigate(['/login'])
          }, 3000)
        },
        error: (err) => {
          this.error = err.error?.message || 'An error occurred. Please try again.'
          this.loading = false
        },
      })
  }
}

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '../auth.service'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = ''
  password = ''
  rememberMe = false
  loading = false
  error: string | null = null

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password'
      return
    }

    this.loading = true
    this.error = null

    this.authService.login(this.email, this.password, this.rememberMe).subscribe({
      next: () => {
        const user = this.authService.getCurrentUser()
        if (user?.mustChangePassword) {
          this.router.navigate(['/change-password'])
        } else if (user?.role === 'sys_admin') {
          this.router.navigate(['/sysadmin'])
        } else if (user?.role === 'org_admin') {
          this.router.navigate(['/orgadmin/allowed-emails'])
        } else {
          this.router.navigate(['/fnfnroles'])
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid email or password'
        this.loading = false
      }
    })
  }
}

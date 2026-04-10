import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from './auth.service'

export const authGuard = () => {
  const authService: AuthService = inject(AuthService)
  const router: Router = inject(Router)

  if (authService.isAuthenticated()) {
    return true
  }

  router.navigate(['/login'])
  return false
}

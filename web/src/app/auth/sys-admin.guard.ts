import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from './auth.service'

export const sysAdminGuard = () => {
  const authService: AuthService = inject(AuthService)
  const router: Router = inject(Router)

  if (authService.isAuthenticated() && authService.isSysAdmin()) {
    return true
  }

  router.navigate(['/login'])
  return false
}

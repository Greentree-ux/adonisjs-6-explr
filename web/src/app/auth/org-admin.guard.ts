import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from './auth.service'

export const orgAdminGuard = () => {
  const authService: AuthService = inject(AuthService)
  const router: Router = inject(Router)

  if (authService.isAuthenticated() && authService.isOrgAdmin()) {
    return true
  }

  router.navigate(['/login'])
  return false
}

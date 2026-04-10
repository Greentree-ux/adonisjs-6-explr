import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from './auth.service'

/**
 * Redirects users who must change their password to the change-password screen.
 * Use on all protected routes except the change-password route itself.
 */
export const changePasswordGuard = () => {
  const authService: AuthService = inject(AuthService)
  const router: Router = inject(Router)

  if (authService.needsPasswordChange()) {
    router.navigate(['/change-password'])
    return false
  }

  return true
}

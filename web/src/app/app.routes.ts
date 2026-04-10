import { Routes } from '@angular/router'
import { LoginComponent } from './auth/login/login.component'
import { RegisterComponent } from './auth/register/register.component'
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component'
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component'
import { ChangePasswordComponent } from './auth/change-password/change-password.component'
import { FnfnrolesListComponent } from './fnfnroles/fnfnroles-list/fnfnroles-list.component'
import { FnfnrolesShowComponent } from './fnfnroles/fnfnroles-show/fnfnroles-show.component'
import { RoleskillsListComponent } from './roleskills/roleskills-list/roleskills-list.component'
import { RoleskillsShowComponent } from './roleskills/roleskills-show/roleskills-show.component'
import { CreateOrgAdminComponent } from './sysadmin/create-org-admin/create-org-admin.component'
import { AllowedEmailsComponent } from './orgadmin/allowed-emails/allowed-emails.component'
import { EmployeeManagerComponent } from './orgadmin/employee-manager/employee-manager.component'
import { authGuard } from './auth/auth.guard'
import { sysAdminGuard } from './auth/sys-admin.guard'
import { orgAdminGuard } from './auth/org-admin.guard'
import { changePasswordGuard } from './auth/change-password.guard'

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Sys Admin routes
  { path: 'sysadmin', component: CreateOrgAdminComponent, canActivate: [sysAdminGuard, changePasswordGuard] },

  // Org Admin routes
  { path: 'orgadmin/allowed-emails', component: AllowedEmailsComponent, canActivate: [orgAdminGuard, changePasswordGuard] },
  { path: 'orgadmin/employee-manager', component: EmployeeManagerComponent, canActivate: [orgAdminGuard, changePasswordGuard] },

  // Regular user routes
  { path: 'fnfnroles', component: FnfnrolesListComponent, canActivate: [authGuard, changePasswordGuard] },
  { path: 'fnfnroles/:fnid/:roleno', component: FnfnrolesShowComponent, canActivate: [authGuard, changePasswordGuard] },
  { path: 'roleskills', component: RoleskillsListComponent, canActivate: [authGuard, changePasswordGuard] },
  { path: 'roleskills/:fnid/:roleno', component: RoleskillsShowComponent, canActivate: [authGuard, changePasswordGuard] },
];

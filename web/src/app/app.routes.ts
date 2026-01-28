import { Routes } from '@angular/router'
import { FnfnrolesListComponent } from './fnfnroles/fnfnroles-list/fnfnroles-list.component'
import { FnfnrolesShowComponent } from './fnfnroles/fnfnroles-show/fnfnroles-show.component'
import { RoleskillsListComponent } from './roleskills/roleskills-list/roleskills-list.component'
import { RoleskillsShowComponent } from './roleskills/roleskills-show/roleskills-show.component'

export const routes: Routes = [
  { path: '', redirectTo: '/fnfnroles', pathMatch: 'full' },
  { path: 'fnfnroles', component: FnfnrolesListComponent },
  { path: 'fnfnroles/:fnid/:roleno', component: FnfnrolesShowComponent },
  { path: 'roleskills', component: RoleskillsListComponent },
  { path: 'roleskills/:fnid/:roleno', component: RoleskillsShowComponent },
];

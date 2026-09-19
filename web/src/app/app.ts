import { Component } from '@angular/core'
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router'
import { CommonModule } from '@angular/common'
import { AuthService } from './auth/auth.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-container">
      <nav class="main-nav" *ngIf="(authService.currentUser$ | async) as user">
        <div class="nav-brand">
          <h1>Function & Role Management</h1>
        </div>
        <div class="nav-content">
          <ul class="nav-links">
            <!-- Sys Admin nav -->
            <li *ngIf="user.role === 'sys_admin'">
              <a routerLink="/sysadmin" routerLinkActive="active">
                Manage Org Admins
              </a>
            </li>

            <!-- Org Admin nav -->
            <li *ngIf="user.role === 'org_admin'">
              <a routerLink="/orgadmin/emp-data" routerLinkActive="active">
                Employee Data
              </a>
            </li>
            <li *ngIf="user.role === 'org_admin'">
              <a routerLink="/orgadmin/invite-employees" routerLinkActive="active">
                Invite Employees
              </a>
            </li>
            <li *ngIf="user.role === 'org_admin'">
              <a routerLink="/orgadmin/employee-manager" routerLinkActive="active">
                Employee-Manager
              </a>
            </li>
            <li *ngIf="user.role === 'org_admin'">
              <a routerLink="/orgadmin/access-policy" routerLinkActive="active">
                Access Policy
              </a>
            </li>

            <!-- Regular user nav (also visible to org_admin) -->
            <li *ngIf="user.role !== 'sys_admin'">
              <a routerLink="/fnfnroles" routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}">
                Function Roles
              </a>
            </li>
            <li *ngIf="user.role !== 'sys_admin'">
              <a routerLink="/roleskills" routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}">
                Role Skills
              </a>
            </li>
              <li *ngIf="user.role !== 'sys_admin'">
                <a routerLink="/assessment" routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}">
                  Assessment
                </a>
              </li>
              <li *ngIf="user.role !== 'sys_admin'">
                <a routerLink="/development-planning" routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}">
                  Development Planning
                </a>
              </li>
          </ul>
          <div class="user-menu">
            <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
            <button (click)="logout()" class="logout-button">Logout</button>
          </div>
        </div>
      </nav>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-nav {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .nav-brand h1 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }

    .nav-links {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      gap: 2rem;
    }

    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.2s;
      font-weight: 500;
    }

    .nav-links a:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .nav-links a.active {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-name {
      font-weight: 500;
    }

    .logout-button {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;

      &:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
    }

    .main-content {
      flex: 1;
      background-color: #f5f5f5;
    }

    @media (max-width: 768px) {
      .main-nav {
        padding: 1rem;
      }

      .nav-brand h1 {
        font-size: 1.25rem;
      }

      .nav-content {
        flex-direction: column;
        align-items: stretch;
      }

      .nav-links {
        flex-direction: column;
        gap: 0.5rem;
      }

      .user-menu {
        justify-content: space-between;
      }
    }
  `]
})
export class App {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login'])
      }
    })
  }
}

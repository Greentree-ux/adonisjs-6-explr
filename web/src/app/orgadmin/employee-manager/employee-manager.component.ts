import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'

interface UserRow {
  id: number
  email: string
  firstName: string
  lastName: string | null
  empId: number
  mgrId: number
  editing?: boolean
  newMgrId?: number
}

@Component({
  selector: 'app-employee-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Org Admin — Employee-Manager Mapping</h2>

      <div class="card">
        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <div class="search-bar">
          <input type="text" [(ngModel)]="searchTerm" name="search" placeholder="Search by name or email..." />
        </div>

        <table class="data-table" *ngIf="filteredUsers.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Emp ID</th>
              <th>Manager ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of filteredUsers">
              <td>{{ u.firstName }} {{ u.lastName }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.empId }}</td>
              <td>
                <span *ngIf="!u.editing">{{ u.mgrId }}</span>
                <input *ngIf="u.editing" type="number" [(ngModel)]="u.newMgrId" [name]="'mgr_' + u.id" class="inline-input" />
              </td>
              <td>
                <button *ngIf="!u.editing" class="btn-small" (click)="startEdit(u)">Edit</button>
                <button *ngIf="u.editing" class="btn-primary-small" (click)="saveManager(u)">Save</button>
                <button *ngIf="u.editing" class="btn-cancel" (click)="cancelEdit(u)">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="filteredUsers.length === 0" class="empty-text">No users found.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 900px; margin: 0 auto; }
    h2 { margin-bottom: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .search-bar { margin-bottom: 1rem; }
    .search-bar input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .data-table th { font-weight: 600; background: #f9f9f9; }
    .inline-input { width: 80px; padding: 0.25rem; border: 1px solid #667eea; border-radius: 4px; }
    .btn-small { padding: 0.25rem 0.75rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary-small { padding: 0.25rem 0.75rem; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn-cancel { padding: 0.25rem 0.75rem; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 0.25rem; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
  `]
})
export class EmployeeManagerComponent {
  users: UserRow[] = []
  searchTerm = ''
  error: string | null = null
  success: string | null = null

  constructor(private http: HttpClient) {
    this.loadUsers()
  }

  get filteredUsers(): UserRow[] {
    if (!this.searchTerm) return this.users
    const term = this.searchTerm.toLowerCase()
    return this.users.filter(u =>
      u.firstName.toLowerCase().includes(term) ||
      (u.lastName?.toLowerCase() || '').includes(term) ||
      u.email.toLowerCase().includes(term)
    )
  }

  loadUsers(): void {
    this.http.get<{ data: { users: UserRow[] } }>('/api/admin/users').subscribe({
      next: (res) => { this.users = res.data.users },
      error: () => {}
    })
  }

  startEdit(user: UserRow): void {
    user.editing = true
    user.newMgrId = user.mgrId
  }

  cancelEdit(user: UserRow): void {
    user.editing = false
  }

  saveManager(user: UserRow): void {
    this.error = null
    this.success = null

    this.http.patch<{ message: string }>(`/api/admin/users/${user.id}/manager`, { mgrId: user.newMgrId }).subscribe({
      next: (res) => {
        user.mgrId = user.newMgrId!
        user.editing = false
        this.success = res.message
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update manager'
      }
    })
  }
}

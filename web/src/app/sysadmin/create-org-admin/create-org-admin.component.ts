import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'

interface OrgAdmin {
  id: number
  email: string
  firstName: string
  lastName: string | null
  createdAt: string
}

@Component({
  selector: 'app-create-org-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Sys Admin — Manage Org Admins</h2>

      <!-- Create form -->
      <div class="card">
        <h3>Create Org Admin</h3>
        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="onCreate()">
          <div class="form-row">
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="form.email" name="email" required />
            </div>
            <div class="form-group">
              <label>First Name</label>
              <input type="text" [(ngModel)]="form.firstName" name="firstName" required />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" [(ngModel)]="form.lastName" name="lastName" />
            </div>
            <div class="form-group">
              <label>Initial Password</label>
              <input type="text" [(ngModel)]="form.password" name="password" required minlength="8" />
            </div>
          </div>
          <button type="submit" [disabled]="loading" class="btn-primary">
            {{ loading ? 'Creating...' : 'Create Org Admin' }}
          </button>
        </form>
      </div>

      <!-- Existing Org Admins list -->
      <div class="card">
        <h3>Existing Org Admins</h3>
        <table class="data-table" *ngIf="orgAdmins.length > 0">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let admin of orgAdmins">
              <td>{{ admin.email }}</td>
              <td>{{ admin.firstName }} {{ admin.lastName }}</td>
              <td>{{ admin.createdAt | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="orgAdmins.length === 0" class="empty-text">No Org Admins created yet.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 900px; margin: 0 auto; }
    h2 { margin-bottom: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
    h3 { margin: 0 0 1rem; }
    .form-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    .form-group { flex: 1; min-width: 180px; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .form-group input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .btn-primary { padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .data-table th { font-weight: 600; background: #f9f9f9; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
  `]
})
export class CreateOrgAdminComponent {
  form = { email: '', firstName: '', lastName: '', password: '' }
  orgAdmins: OrgAdmin[] = []
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(private http: HttpClient) {
    this.loadOrgAdmins()
  }

  loadOrgAdmins(): void {
    this.http.get<{ data: { orgAdmins: OrgAdmin[] } }>('/api/sysadmin/org-admins').subscribe({
      next: (res) => { this.orgAdmins = res.data.orgAdmins },
      error: () => {}
    })
  }

  onCreate(): void {
    this.error = null
    this.success = null
    this.loading = true

    this.http.post<{ message: string }>('/api/sysadmin/org-admins', this.form).subscribe({
      next: (res) => {
        this.success = res.message
        this.form = { email: '', firstName: '', lastName: '', password: '' }
        this.loading = false
        this.loadOrgAdmins()
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create Org Admin'
        this.loading = false
      }
    })
  }
}

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'

interface OrgAdmin {
  id: number
  coId: number | null
  email: string
  firstName: string
  lastName: string | null
  createdAt: string
}

interface Company {
  id: number
  coName: string
}

@Component({
  selector: 'app-create-org-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Sys Admin — Manage Org Admins</h2>

      <div class="card">
        <h3>Client Organisation</h3>
        <div class="form-group company-select-group">
          <label for="companySelect">Select Company</label>
          <select
            id="companySelect"
            [(ngModel)]="selectedCoId"
            name="selectedCoId"
            (ngModelChange)="onCompanyChange()"
            [disabled]="loadingCompanies || companies.length === 0"
          >
            <option [ngValue]="null">-- Select Company --</option>
            <option *ngFor="let company of companies" [ngValue]="company.id">{{ company.coName }}</option>
          </select>
        </div>
        <p *ngIf="loadingCompanies" class="empty-text">Loading companies...</p>
        <p *ngIf="!loadingCompanies && companies.length === 0" class="empty-text">No companies found.</p>
      </div>

      <!-- Create form -->
      <div class="card" *ngIf="selectedCoId">
        <h3>Create Org Admin</h3>
        <p class="info-text">Selected company: <strong>{{ getSelectedCompanyName() }}</strong></p>
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
      <div class="card" *ngIf="selectedCoId">
        <div class="table-header-row">
          <div>
            <h3>Existing Org Admins</h3>
            <p class="info-text">Showing org admins appointed at <strong>{{ getSelectedCompanyName() }}</strong>.</p>
          </div>
          <button
            type="button"
            class="btn-danger"
            [disabled]="selectedAdminIds.length === 0 || deleting"
            (click)="onDeleteSelected()"
          >
            {{ deleting ? 'Deleting...' : 'Delete Selected' }}
          </button>
        </div>
        <table class="data-table" *ngIf="orgAdmins.length > 0">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  [checked]="allSelected"
                  [indeterminate]="someSelected"
                  (change)="toggleAllSelections($event)"
                />
              </th>
              <th>Email</th>
              <th>Name</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let admin of orgAdmins">
              <td>
                <input
                  type="checkbox"
                  [checked]="isSelected(admin.id)"
                  (change)="toggleSelection(admin.id, $event)"
                />
              </td>
              <td>{{ admin.email }}</td>
              <td>{{ admin.firstName }} {{ admin.lastName }}</td>
              <td>{{ admin.createdAt | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="orgAdmins.length === 0 && !loadingOrgAdmins" class="empty-text">No Org Admins created yet for this company.</p>
        <p *ngIf="loadingOrgAdmins" class="empty-text">Loading Org Admins...</p>
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
    .form-group input, .form-group select { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .company-select-group { max-width: 360px; }
    .btn-primary { padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; }
    .btn-danger { padding: 0.5rem 1rem; background: #b42318; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .data-table th { font-weight: 600; background: #f9f9f9; }
    .table-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
    .info-text { color: #555; margin: 0.25rem 0 0; }
  `]
})
export class CreateOrgAdminComponent {
  form = { email: '', firstName: '', lastName: '', password: '' }
  companies: Company[] = []
  selectedCoId: number | null = null
  orgAdmins: OrgAdmin[] = []
  selectedAdminIds: number[] = []
  loading = false
  loadingCompanies = true
  loadingOrgAdmins = false
  deleting = false
  error: string | null = null
  success: string | null = null

  constructor(private http: HttpClient) {
    this.loadOrgAdmins()
  }

  loadOrgAdmins(): void {
    this.loadingCompanies = true
    this.loadingOrgAdmins = true

    const query = this.selectedCoId ? `?coId=${this.selectedCoId}` : ''

    this.http.get<{ data: { companies: Company[]; selectedCoId: number | null; orgAdmins: OrgAdmin[] } }>(`/api/sysadmin/org-admins${query}`).subscribe({
      next: (res) => {
        this.companies = res.data.companies
        this.selectedCoId = res.data.selectedCoId
        this.orgAdmins = res.data.orgAdmins
        this.selectedAdminIds = []
        this.loadingCompanies = false
        this.loadingOrgAdmins = false
      },
      error: () => {
        this.loadingCompanies = false
        this.loadingOrgAdmins = false
      }
    })
  }

  onCompanyChange(): void {
    this.error = null
    this.success = null
    this.loadOrgAdmins()
  }

  getSelectedCompanyName(): string {
    return this.companies.find((company) => company.id === this.selectedCoId)?.coName ?? 'Unknown company'
  }

  isSelected(id: number): boolean {
    return this.selectedAdminIds.includes(id)
  }

  get allSelected(): boolean {
    return this.orgAdmins.length > 0 && this.selectedAdminIds.length === this.orgAdmins.length
  }

  get someSelected(): boolean {
    return this.selectedAdminIds.length > 0 && this.selectedAdminIds.length < this.orgAdmins.length
  }

  toggleSelection(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked

    this.selectedAdminIds = checked
      ? Array.from(new Set([...this.selectedAdminIds, id]))
      : this.selectedAdminIds.filter((selectedId) => selectedId !== id)
  }

  toggleAllSelections(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.selectedAdminIds = checked ? this.orgAdmins.map((admin) => admin.id) : []
  }

  onCreate(): void {
    this.error = null
    this.success = null
    this.loading = true

    if (!this.selectedCoId) {
      this.error = 'Select a company before creating an Org Admin'
      this.loading = false
      return
    }

    this.http.post<{ message: string }>('/api/sysadmin/org-admins', { ...this.form, coId: this.selectedCoId }).subscribe({
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

  onDeleteSelected(): void {
    if (!this.selectedCoId || this.selectedAdminIds.length === 0) {
      return
    }

    const confirmed = window.confirm(
      this.selectedAdminIds.length === 1
        ? 'Delete the selected Org Admin?'
        : `Delete ${this.selectedAdminIds.length} selected Org Admins?`
    )

    if (!confirmed) {
      return
    }

    this.error = null
    this.success = null
    this.deleting = true

    this.http.delete<{ message: string }>('/api/sysadmin/org-admins', {
      body: {
        coId: this.selectedCoId,
        userIds: this.selectedAdminIds,
      },
    }).subscribe({
      next: (res) => {
        this.success = res.message
        this.selectedAdminIds = []
        this.deleting = false
        this.loadOrgAdmins()
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to delete Org Admins'
        this.deleting = false
      }
    })
  }
}

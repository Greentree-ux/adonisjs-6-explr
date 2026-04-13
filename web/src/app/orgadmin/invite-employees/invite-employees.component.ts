import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'

interface EmpDataRecord {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  empId: number | null
}

interface FnRoleRecord {
  id: number
  fnid: number
  fnName: string
  roleno: number
  roleName: string
}

interface InviteRow {
  empData: EmpDataRecord
  selected: boolean
  fnroleId: number | null
  mgrId: number | null
}

interface InviteResult {
  email: string
  status: string
}

@Component({
  selector: 'app-invite-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Org Admin — Invite Employees to Register</h2>

      <div class="alert error" *ngIf="error">{{ error }}</div>
      <div class="alert success" *ngIf="success">{{ success }}</div>

      <!-- Results -->
      <div class="card" *ngIf="results.length > 0">
        <h3>Invitation Results</h3>
        <table class="data-table">
          <thead>
            <tr><th>Email</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of results">
              <td>{{ r.email }}</td>
              <td>{{ r.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Employee selection table -->
      <div class="card">
        <h3>Unregistered Employees ({{ rows.length }})</h3>
        <p class="info-text" *ngIf="rows.length > 0">
          Select employees, assign a function role and manager, then click Send Invitations.
        </p>

        <div class="table-scroll" *ngIf="rows.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" (change)="toggleAll($event)" [checked]="allSelected" /></th>
                <th>Emp ID</th>
                <th>Email</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Function Role</th>
                <th>Manager</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows" [class.selected-row]="row.selected">
                <td><input type="checkbox" [(ngModel)]="row.selected" [name]="'sel_' + row.empData.id" /></td>
                <td>{{ row.empData.empId }}</td>
                <td>{{ row.empData.email }}</td>
                <td>{{ row.empData.firstName }}</td>
                <td>{{ row.empData.lastName }}</td>
                <td>
                  <select [(ngModel)]="row.fnroleId" [name]="'fnrole_' + row.empData.id">
                    <option [ngValue]="null">-- Select --</option>
                    <option *ngFor="let fr of fnRoles" [ngValue]="fr.id">
                      {{ fr.fnName }} — {{ fr.roleName }}
                    </option>
                  </select>
                </td>
                <td>
                  <select [(ngModel)]="row.mgrId" [name]="'mgr_' + row.empData.id">
                    <option [ngValue]="null">-- Select --</option>
                    <option *ngFor="let e of allEmployees" [ngValue]="e.empId">
                      {{ e.empId }} — {{ e.firstName }} {{ e.lastName }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p *ngIf="rows.length === 0 && !loadingData" class="empty-text">All employees have been registered or invited.</p>
        <p *ngIf="loadingData" class="empty-text">Loading...</p>

        <div class="action-bar" *ngIf="selectedCount > 0">
          <button (click)="onSendInvitations()" [disabled]="sending" class="btn-primary">
            {{ sending ? 'Sending...' : 'Send Invitations (' + selectedCount + ')' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 1100px; margin: 0 auto; }
    h2 { margin-bottom: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
    h3 { margin: 0 0 0.5rem; }
    .info-text { color: #666; margin-bottom: 1rem; }
    .table-scroll { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
    .data-table th { font-weight: 600; background: #f9f9f9; position: sticky; top: 0; }
    .data-table select { padding: 0.3rem; border: 1px solid #ddd; border-radius: 4px; width: 100%; min-width: 140px; }
    .selected-row { background-color: #f0f4ff; }
    .action-bar { margin-top: 1rem; display: flex; gap: 0.5rem; }
    .btn-primary { padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
  `]
})
export class InviteEmployeesComponent implements OnInit {
  rows: InviteRow[] = []
  fnRoles: FnRoleRecord[] = []
  allEmployees: EmpDataRecord[] = []
  results: InviteResult[] = []
  loadingData = true
  sending = false
  error: string | null = null
  success: string | null = null

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData()
  }

  loadData(): void {
    this.loadingData = true
    // Load fn_roles, all emp_data (for manager dropdown), and unregistered emp_data
    this.http.get<{ data: { fnRoles: FnRoleRecord[] } }>('/api/admin/fn-roles').subscribe({
      next: (res) => { this.fnRoles = res.data.fnRoles },
      error: () => {}
    })

    this.http.get<{ data: { empData: EmpDataRecord[] } }>('/api/admin/emp-data').subscribe({
      next: (res) => { this.allEmployees = res.data.empData },
      error: () => {}
    })

    this.http.get<{ data: { empData: EmpDataRecord[] } }>('/api/admin/emp-data-invite').subscribe({
      next: (res) => {
        this.rows = res.data.empData.map((e) => ({
          empData: e,
          selected: false,
          fnroleId: null,
          mgrId: null,
        }))
        this.loadingData = false
      },
      error: () => { this.loadingData = false }
    })
  }

  get selectedCount(): number {
    return this.rows.filter((r) => r.selected).length
  }

  get allSelected(): boolean {
    return this.rows.length > 0 && this.rows.every((r) => r.selected)
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.rows.forEach((r) => r.selected = checked)
  }

  onSendInvitations(): void {
    const selected = this.rows.filter((r) => r.selected)
    const invalid = selected.filter((r) => !r.fnroleId || !r.mgrId)
    if (invalid.length > 0) {
      this.error = `Please assign a Function Role and Manager for all selected employees (${invalid.length} missing).`
      return
    }

    this.error = null
    this.success = null
    this.results = []
    this.sending = true

    const invitations = selected.map((r) => ({
      empDataId: r.empData.id,
      fnroleId: r.fnroleId!,
      mgrId: r.mgrId!,
    }))

    this.http.post<{ message: string; data: { results: InviteResult[] } }>(
      '/api/admin/send-invitations',
      { invitations }
    ).subscribe({
      next: (res) => {
        this.success = res.message
        this.results = res.data.results
        this.sending = false
        this.loadData()
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send invitations'
        this.sending = false
      }
    })
  }
}

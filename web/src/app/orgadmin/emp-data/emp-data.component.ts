import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { AuthService } from '../../auth/auth.service'

interface EmpDataRecord {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  empId: number | null
  dateOfJoining: string | null
  lastRoleChange: string | null
  createdAt: string
}

interface EmpDataImportSummary {
  totalRows: number
  created: number
  updated: number
  skipped: number
}

interface EmpDataImportResult {
  row: number
  email: string
  status: string
}

@Component({
  selector: 'app-emp-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Org Admin — Employee Data</h2>

      <div class="card csv-spec-card">
        <h3>CSV Import Specification</h3>
        <p class="info-text">
          Ask each client organisation to provide employee master data as a UTF-8 CSV file with the exact headers shown below.
        </p>
        <div class="spec-grid">
          <div>
            <h4>Required Columns</h4>
            <ul>
              <li><strong>email</strong>: employee login email, globally unique across the platform</li>
            </ul>
          </div>
          <div>
            <h4>Optional Columns</h4>
            <ul>
              <li><strong>first_name</strong>: employee first name</li>
              <li><strong>last_name</strong>: employee last name</li>
              <li><strong>emp_id</strong>: employee identifier used for manager mapping</li>
              <li><strong>date_of_joining</strong>: date in <strong>DD-MM-YYYY</strong> format</li>
              <li><strong>last_role_change</strong>: date in <strong>DD-MM-YYYY</strong> format</li>
            </ul>
          </div>
        </div>
        <p class="info-text">
          The importing org admin's company is applied automatically during import. Do not include company columns in the CSV file.
        </p>
        <pre class="csv-example">email,first_name,last_name,emp_id,date_of_joining,last_role_change
alex.mukherjee@example.com,Alex,Mukherjee,100231,15-04-2024,10-01-2025
priya.nair@example.com,Priya,Nair,100232,01-11-2023,</pre>
        <div class="import-panel">
          <div>
            <label class="file-label">Upload CSV</label>
            <input type="file" accept=".csv,text/csv" (change)="onFileSelected($event)" />
          </div>
          <label class="checkbox-row">
            <input type="checkbox" [(ngModel)]="updateExistingOnImport" name="updateExistingOnImport" />
            Update existing employee rows when email already exists in this company
          </label>
          <div class="button-row">
            <button type="button" class="btn-primary" (click)="onImportCsv()" [disabled]="importLoading || !selectedFile">
              {{ importLoading ? 'Importing...' : 'Import CSV' }}
            </button>
            <span class="selected-file" *ngIf="selectedFile">{{ selectedFile.name }}</span>
          </div>
        </div>
        <div class="alert error" *ngIf="importError">{{ importError }}</div>
        <div class="alert success" *ngIf="importSuccess">{{ importSuccess }}</div>
        <div class="import-results" *ngIf="importSummary || importResults.length > 0">
          <p *ngIf="importSummary" class="info-text">
            Processed {{ importSummary.totalRows }} rows. Created: {{ importSummary.created }}, Updated: {{ importSummary.updated }}, Skipped: {{ importSummary.skipped }}.
          </p>
          <table class="data-table compact-table" *ngIf="importResults.length > 0">
            <thead>
              <tr>
                <th>Row</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let result of importResults">
                <td>{{ result.row }}</td>
                <td>{{ result.email || '—' }}</td>
                <td>{{ result.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add / Edit form -->
      <div class="card">
        <h3>{{ editingId ? 'Edit Employee' : 'Add Employee' }}</h3>
        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="form.email" name="email" required />
            </div>
            <div class="form-group">
              <label>First Name</label>
              <input type="text" [(ngModel)]="form.firstName" name="firstName" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" [(ngModel)]="form.lastName" name="lastName" />
            </div>
            <div class="form-group">
              <label>Emp ID</label>
              <input type="number" [(ngModel)]="form.empId" name="empId" />
            </div>
            <div class="form-group">
              <label>Date of Joining</label>
              <input type="text" [(ngModel)]="form.dateOfJoining" name="dateOfJoining" placeholder="DD-MM-YYYY" />
            </div>
            <div class="form-group">
              <label>Last Role Change</label>
              <input type="text" [(ngModel)]="form.lastRoleChange" name="lastRoleChange" placeholder="DD-MM-YYYY" />
            </div>
          </div>
          <div class="button-row">
            <button type="submit" [disabled]="loading" class="btn-primary">
              {{ loading ? 'Saving...' : (editingId ? 'Update' : 'Add Employee') }}
            </button>
            <button type="button" *ngIf="editingId" (click)="cancelEdit()" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>

      <!-- List -->
      <div class="card">
        <h3>Employees ({{ employees.length }})</h3>
        <div class="toolbar" *ngIf="employees.length > 0">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearchChange()"
            name="searchTerm"
            class="search-input"
            placeholder="Search by any displayed field..."
          />
          <label class="page-size-label">
            Rows
            <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()" name="pageSize">
              <option [ngValue]="10">10</option>
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
            </select>
          </label>
        </div>

        <table class="data-table" *ngIf="pagedEmployees.length > 0">
          <thead>
            <tr>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Emp ID</th>
              <th>Date of Joining</th>
              <th>Last Role Change</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of pagedEmployees">
              <td>{{ e.email }}</td>
              <td>{{ e.firstName }}</td>
              <td>{{ e.lastName }}</td>
              <td>{{ e.empId }}</td>
              <td>{{ e.dateOfJoining || '—' }}</td>
              <td>{{ e.lastRoleChange || '—' }}</td>
              <td>{{ e.createdAt | date:'short' }}</td>
              <td class="action-cell">
                <ng-container *ngIf="!isOwnProfile(e); else protectedRowActions">
                  <button class="btn-edit" (click)="onEdit(e)">Edit</button>
                  <button class="btn-danger" (click)="onRemove(e)">Remove</button>
                </ng-container>
                <ng-template #protectedRowActions>
                  <span class="protected-badge">Protected</span>
                </ng-template>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination" *ngIf="filteredEmployees.length > 0">
          <span>Showing {{ pageStart }}-{{ pageEnd }} of {{ filteredEmployees.length }}</span>
          <div class="pagination-actions">
            <button class="btn-secondary" (click)="prevPage()" [disabled]="currentPage === 1">Previous</button>
            <span>Page {{ currentPage }} / {{ totalPages }}</span>
            <button class="btn-secondary" (click)="nextPage()" [disabled]="currentPage === totalPages">Next</button>
          </div>
        </div>
        <p *ngIf="employees.length === 0" class="empty-text">No employee data yet.</p>
        <p *ngIf="employees.length > 0 && filteredEmployees.length === 0" class="empty-text">No employees match the current search.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 900px; margin: 0 auto; }
    h2 { margin-bottom: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
    h3 { margin: 0 0 1rem; }
    h4 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .info-text { color: #555; }
    .csv-spec-card { background: linear-gradient(180deg, #fbfcff 0%, #f5f8ff 100%); }
    .spec-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .spec-grid ul { margin: 0; padding-left: 1.2rem; }
    .csv-example { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; }
    .import-panel { display: grid; gap: 0.75rem; margin-top: 1rem; }
    .file-label { display: block; margin-bottom: 0.35rem; font-weight: 600; }
    .checkbox-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .selected-file { color: #334155; font-size: 0.9rem; align-self: center; }
    .import-results { margin-top: 1rem; }
    .compact-table th, .compact-table td { padding: 0.45rem 0.5rem; font-size: 0.92rem; }
    .protected-badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: 0.78rem; font-weight: 600; }
    .form-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    .form-group { flex: 1; min-width: 150px; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .form-group input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .button-row { display: flex; gap: 0.5rem; }
    .btn-primary { padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; }
    .btn-secondary { padding: 0.5rem 1.5rem; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn-edit { padding: 0.25rem 0.75rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.25rem; }
    .btn-danger { padding: 0.25rem 0.75rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .action-cell { white-space: nowrap; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .data-table th { font-weight: 600; background: #f9f9f9; }
    .toolbar { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; align-items: center; flex-wrap: wrap; }
    .search-input { flex: 1; min-width: 240px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .page-size-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
    .page-size-label select { padding: 0.35rem; border: 1px solid #ddd; border-radius: 4px; }
    .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; gap: 1rem; flex-wrap: wrap; }
    .pagination-actions { display: flex; align-items: center; gap: 0.75rem; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
    @media (max-width: 800px) { .spec-grid { grid-template-columns: 1fr; } }
  `]
})
export class EmpDataComponent {
  employees: EmpDataRecord[] = []
  selectedFile: File | null = null
  updateExistingOnImport = true
  importLoading = false
  importError: string | null = null
  importSuccess: string | null = null
  importSummary: EmpDataImportSummary | null = null
  importResults: EmpDataImportResult[] = []
  currentUserEmail: string | null = null
  searchTerm = ''
  currentPage = 1
  pageSize = 10
  form = {
    email: '',
    firstName: '',
    lastName: '',
    empId: null as number | null,
    dateOfJoining: '',
    lastRoleChange: '',
  }
  editingId: number | null = null
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.currentUserEmail = this.authService.getCurrentUser()?.email?.toLowerCase() ?? null
    this.authService.currentUser$.subscribe((user) => {
      this.currentUserEmail = user?.email?.toLowerCase() ?? null
    })
    this.loadEmployees()
  }

  loadEmployees(): void {
    this.http.get<{ data: { empData: EmpDataRecord[] } }>('/api/admin/emp-data').subscribe({
      next: (res) => {
        this.employees = res.data.empData
        this.currentPage = 1
      },
      error: () => {}
    })
  }

  get filteredEmployees(): EmpDataRecord[] {
    const term = this.searchTerm.trim().toLowerCase()
    if (!term) return this.employees

    return this.employees.filter((employee) => {
      return [
        employee.email,
        employee.firstName ?? '',
        employee.lastName ?? '',
        employee.empId?.toString() ?? '',
        employee.dateOfJoining ?? '',
        employee.lastRoleChange ?? '',
        employee.createdAt ?? '',
      ].some((value) => value.toLowerCase().includes(term))
    })
  }

  get pagedEmployees(): EmpDataRecord[] {
    const start = (this.currentPage - 1) * this.pageSize
    return this.filteredEmployees.slice(start, start + this.pageSize)
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmployees.length / this.pageSize))
  }

  get pageStart(): number {
    if (this.filteredEmployees.length === 0) return 0
    return (this.currentPage - 1) * this.pageSize + 1
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEmployees.length)
  }

  onSearchChange(): void {
    this.currentPage = 1
  }

  onPageSizeChange(): void {
    this.currentPage = 1
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1
    }
  }

  onSubmit(): void {
    this.error = null
    this.success = null
    this.importError = null
    this.importSuccess = null
    this.loading = true

    if (this.editingId) {
      this.http.put<{ message: string }>(`/api/admin/emp-data/${this.editingId}`, this.form).subscribe({
        next: (res) => {
          this.success = res.message
          this.resetForm()
          this.loadEmployees()
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to update employee'
          this.loading = false
        }
      })
    } else {
      this.http.post<{ message: string }>('/api/admin/emp-data', this.form).subscribe({
        next: (res) => {
          this.success = res.message
          this.resetForm()
          this.loadEmployees()
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to add employee'
          this.loading = false
        }
      })
    }
  }

  onEdit(emp: EmpDataRecord): void {
    if (this.isOwnProfile(emp)) {
      this.error = 'You cannot edit your own org-admin profile here'
      this.success = null
      return
    }

    this.editingId = emp.id
    this.form = {
      email: emp.email,
      firstName: emp.firstName ?? '',
      lastName: emp.lastName ?? '',
      empId: emp.empId,
      dateOfJoining: emp.dateOfJoining ?? '',
      lastRoleChange: emp.lastRoleChange ?? '',
    }
    this.error = null
    this.success = null
  }

  cancelEdit(): void {
    this.resetForm()
  }

  onRemove(emp: EmpDataRecord): void {
    if (this.isOwnProfile(emp)) {
      this.error = 'You cannot remove your own org-admin profile here'
      this.success = null
      return
    }

    const confirmRemove = (globalThis as { confirm?: (message?: string) => boolean }).confirm
    if (!confirmRemove?.(`Remove ${emp.email} from employee data?`)) return

    this.http.delete<{ message: string }>(`/api/admin/emp-data/${emp.id}`).subscribe({
      next: () => { this.loadEmployees() },
      error: (err) => { this.error = err.error?.message || 'Failed to remove employee' }
    })
  }

  onFileSelected(event: Event): void {
    const target = event.target as { files?: { item: (index: number) => File | null } | null } | null
    this.selectedFile = target?.files?.item(0) ?? null
  }

  onImportCsv(): void {
    if (!this.selectedFile) {
      this.importError = 'Please choose a CSV file to import'
      return
    }

    this.importLoading = true
    this.importError = null
    this.importSuccess = null
    this.importSummary = null
    this.importResults = []

    const formData = new FormData()
    formData.append('file', this.selectedFile)
    formData.append('updateExisting', String(this.updateExistingOnImport))

    this.http
      .post<{
        message: string
        data: { summary: EmpDataImportSummary; results: EmpDataImportResult[] }
      }>('/api/admin/emp-data/import', formData)
      .subscribe({
        next: (res) => {
          this.importSuccess = res.message
          this.importSummary = res.data.summary
          this.importResults = res.data.results
          this.selectedFile = null
          this.importLoading = false
          this.loadEmployees()
        },
        error: (err) => {
          this.importError = err.error?.message || 'Failed to import CSV file'
          this.importLoading = false
        },
      })
  }

  isOwnProfile(emp: EmpDataRecord): boolean {
    return (emp.email ?? '').toLowerCase() === (this.currentUserEmail ?? '')
  }

  private resetForm(): void {
    this.form = {
      email: '',
      firstName: '',
      lastName: '',
      empId: null,
      dateOfJoining: '',
      lastRoleChange: '',
    }
    this.editingId = null
    this.loading = false
  }
}

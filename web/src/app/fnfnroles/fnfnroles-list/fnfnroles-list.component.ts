import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { FnfnrolesService } from '../fnfnroles.service'

interface FnFnrole {
  fnid: number
  roleno: number
  fnName: string
  roleName: string
}

@Component({
  selector: 'app-fnfnroles-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './fnfnroles-list.html',
  styleUrls: ['./fnfnroles-list.scss']
})
export class FnfnrolesListComponent implements OnInit {
  roles: FnFnrole[] = []
  loading = true
  error: string | null = null

  constructor(private fnfnrolesService: FnfnrolesService) {}

  ngOnInit(): void {
    this.loadRoles()
  }

  loadRoles(): void {
    this.loading = true
    this.error = null
    
    this.fnfnrolesService.list().subscribe({
      next: (response) => {
        this.roles = response.data
        this.loading = false
      },
      error: (err) => {
        console.error('Error loading roles:', err)
        this.error = 'Failed to load roles. Please try again.'
        this.loading = false
      }
    })
  }
}

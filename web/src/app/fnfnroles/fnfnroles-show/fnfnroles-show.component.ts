import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { FnfnrolesService } from '../fnfnroles.service'

interface FnFnrole {
  fnid: number
  roleno: number
  fnName: string
  roleName: string
}

interface Roletaskset {
  fnid: number
  fnName: string
  subfnid: number
  subfnName: string
  sub2Fnord: number
  subSubFnName: string
  roleno: number
  roleName: string
  taskset: string
  ei: string
  lmh: string
}

@Component({
  selector: 'app-fnfnroles-show',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './fnfnroles-show.html',
  styleUrls: ['./fnfnroles-show.scss']
})
export class FnfnrolesShowComponent implements OnInit {
  fnfnrole: FnFnrole | null = null
  roletasksets: Roletaskset[] = []
  loading = true
  error: string | null = null
  fnid: number = 0
  roleno: number = 0

  constructor(
    private route: ActivatedRoute,
    private fnfnrolesService: FnfnrolesService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.fnid = Number(params.get('fnid'))
      this.roleno = Number(params.get('roleno'))
      
      if (this.fnid && this.roleno) {
        this.loadRoleDetails()
      } else {
        this.error = 'Invalid role parameters'
        this.loading = false
      }
    })
  }

  loadRoleDetails(): void {
    this.loading = true
    this.error = null

    this.fnfnrolesService.show(this.fnid, this.roleno).subscribe({
      next: (response) => {
        this.fnfnrole = response.data.fnfnrole
        this.roletasksets = response.data.roletasksets
        this.loading = false
      },
      error: (err) => {
        this.error = 'Failed to load role details. Please try again.'
        this.loading = false
        console.error('Error loading role details:', err)
      }
    })
  }
}

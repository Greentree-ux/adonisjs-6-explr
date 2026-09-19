import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { of, throwError } from 'rxjs'
import { vi } from 'vitest'

import { RoleskillsListComponent } from './roleskills-list.component'
import { RoleskillsService } from '../roleskills.service'

describe('RoleskillsListComponent', () => {
  let component: RoleskillsListComponent
  let fixture: ComponentFixture<RoleskillsListComponent>
  let service: RoleskillsService

  const mockRoleskills = {
    data: [
      { fnid: 1, roleno: 1, fnName: 'Marketing', roleName: 'Manager' },
      { fnid: 2, roleno: 2, fnName: 'Sales', roleName: 'Executive' }
    ]
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RoleskillsListComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(RoleskillsListComponent)
    component = fixture.componentInstance
    service = TestBed.inject(RoleskillsService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should load roleskills on init', () => {
    vi.spyOn(service, 'list').mockReturnValue(of(mockRoleskills))
    
    fixture.detectChanges() // triggers ngOnInit
    
    expect(service.list).toHaveBeenCalled()
    expect(component.roleskills.length).toBe(2)
    expect(component.loading).toBe(false)
  })

  it('should handle errors', () => {
    vi.spyOn(service, 'list').mockReturnValue(throwError(() => new Error('Network error')))
    
    fixture.detectChanges()
    
    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })
})

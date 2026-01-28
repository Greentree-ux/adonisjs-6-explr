import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { of, throwError } from 'rxjs'

import { FnfnrolesListComponent } from './fnfnroles-list.component'
import { FnfnrolesService } from '../fnfnroles.service'

describe('FnfnrolesListComponent', () => {
  let component: FnfnrolesListComponent
  let fixture: ComponentFixture<FnfnrolesListComponent>
  let service: FnfnrolesService

  const mockRoles = {
    data: [
      { fnid: 1, roleno: 1, fn_name: 'Marketing', role_name: 'Manager' },
      { fnid: 2, roleno: 2, fn_name: 'Sales', role_name: 'Executive' }
    ]
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FnfnrolesListComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(FnfnrolesListComponent)
    component = fixture.componentInstance
    service = TestBed.inject(FnfnrolesService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should load roles on init', () => {
    spyOn(service, 'list').and.returnValue(of(mockRoles))
    
    fixture.detectChanges() // triggers ngOnInit
    
    expect(service.list).toHaveBeenCalled()
    expect(component.roles.length).toBe(2)
    expect(component.loading).toBe(false)
  })

  it('should handle errors', () => {
    spyOn(service, 'list').and.returnValue(
      throwError(() => new Error('Network error'))
    )
    
    fixture.detectChanges()
    
    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })
})

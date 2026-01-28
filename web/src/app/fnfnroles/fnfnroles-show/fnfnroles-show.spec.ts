import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ActivatedRoute } from '@angular/router'
import { of, throwError } from 'rxjs'

import { FnfnrolesShowComponent } from './fnfnroles-show.component'
import { FnfnrolesService } from '../fnfnroles.service'

describe('FnfnrolesShowComponent', () => {
  let component: FnfnrolesShowComponent
  let fixture: ComponentFixture<FnfnrolesShowComponent>
  let service: FnfnrolesService

  const mockResponse = {
    data: {
      fnfnrole: {
        fnid: 1,
        roleno: 1,
        fn_name: 'Marketing',
        role_name: 'Manager'
      },
      roletasksets: [
        {
          fnid: 1,
          fn_name: 'Marketing',
          subfnid: 101,
          subfn_name: 'Digital Marketing',
          sub2fnord: 1,
          sub_sub_fn_name: 'Social Media',
          roleno: 1,
          role_name: 'Manager',
          taskset: 'Manage social media campaigns',
          ei: 'E',
          lmh: 'H'
        }
      ]
    }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FnfnrolesShowComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['fnid', '1'], ['roleno', '1']]))
          }
        }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(FnfnrolesShowComponent)
    component = fixture.componentInstance
    service = TestBed.inject(FnfnrolesService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should load role details on init', () => {
    spyOn(service, 'show').and.returnValue(of(mockResponse))

    fixture.detectChanges() // triggers ngOnInit

    expect(service.show).toHaveBeenCalledWith(1, 1)
    expect(component.fnfnrole).toEqual(mockResponse.data.fnfnrole)
    expect(component.roletasksets.length).toBe(1)
    expect(component.loading).toBe(false)
  })

  it('should handle errors', () => {
    spyOn(service, 'show').and.returnValue(
      throwError(() => new Error('Network error'))
    )

    fixture.detectChanges()

    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })

  it('should handle invalid parameters', () => {
    const route = TestBed.inject(ActivatedRoute)
    route.paramMap = of(new Map([['fnid', 'invalid'], ['roleno', '1']]))

    component.ngOnInit()

    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })
})

import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'

import { AuthService } from '../auth.service'
import { RegisterComponent } from './register.component'

describe('RegisterComponent', () => {
  let component: RegisterComponent
  let fixture: ComponentFixture<RegisterComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
            },
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({})),
            params: of({}),
            queryParams: of({}),
            fragment: of(null),
            data: of({}),
            outlet: 'primary',
            component: null,
            routeConfig: null,
            root: null,
            parent: null,
            firstChild: null,
            children: [],
            pathFromRoot: [],
          },
        },
        {
          provide: AuthService,
          useValue: {
            register: () => of({}),
          },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(RegisterComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})

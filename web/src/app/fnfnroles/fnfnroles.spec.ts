import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'

import { FnfnrolesService } from './fnfnroles.service'

describe('FnfnrolesService', () => {
  let service: FnfnrolesService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    })
    service = TestBed.inject(FnfnrolesService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})

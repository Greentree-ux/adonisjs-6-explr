import { TestBed } from '@angular/core/testing';

import { Fnfnroles } from './fnfnroles';

describe('Fnfnroles', () => {
  let service: Fnfnroles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fnfnroles);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

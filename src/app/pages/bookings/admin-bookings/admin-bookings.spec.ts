import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBookings } from './admin-bookings';

describe('AdminBookings', () => {
  let component: AdminBookings;
  let fixture: ComponentFixture<AdminBookings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBookings],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBookings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

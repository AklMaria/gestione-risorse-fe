import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserBookings } from './user-bookings';

describe('UserBookings', () => {
  let component: UserBookings;
  let fixture: ComponentFixture<UserBookings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserBookings],
    }).compileComponents();

    fixture = TestBed.createComponent(UserBookings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

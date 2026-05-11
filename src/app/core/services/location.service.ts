import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LocationSlot {
  id: string;
  address: string;
  longitude: number | null;
  latitude: number | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlanSlot {
  address: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly apiUrl = `${environment.apiUrl}/location`;

  constructor(private http: HttpClient) {}

  /** Get all location slots for a restaurant */
  findByRestaurant(restaurantId: string): Observable<{ status: number; locations: LocationSlot[] }> {
    return this.http.get<{ status: number; locations: LocationSlot[] }>(
      `${this.apiUrl}/restaurant/${restaurantId}`
    );
  }

  /** Create a new location slot */
  create(restaurantId: string, dto: Partial<LocationSlot>): Observable<{ status: number; location: LocationSlot }> {
    return this.http.post<{ status: number; location: LocationSlot }>(
      `${this.apiUrl}/${restaurantId}`,
      dto
    );
  }

  /** Update a location slot */
  update(locationId: string, dto: Partial<LocationSlot>): Observable<{ status: number; location: LocationSlot }> {
    return this.http.patch<{ status: number; location: LocationSlot }>(
      `${this.apiUrl}/${locationId}`,
      dto
    );
  }

  /** Delete a location slot */
  remove(locationId: string): Observable<{ status: number }> {
    return this.http.delete<{ status: number }>(`${this.apiUrl}/${locationId}`);
  }

  /** Replace entire weekly plan (ITINERANT) */
  replaceWeeklyPlan(restaurantId: string, slots: WeeklyPlanSlot[]): Observable<{ status: number; locations: LocationSlot[] }> {
    return this.http.put<{ status: number; locations: LocationSlot[] }>(
      `${this.apiUrl}/restaurant/${restaurantId}/weekly-plan`,
      { slots }
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  status: number;
  totalUsers: number;
  totalRestaurants: number;
  premiumUsers: number;
  premiumRestaurants: number;
  recentUsers: RecentUser[];
  recentRestaurants: RecentRestaurant[];
}

export interface RecentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface RecentRestaurant {
  id: string;
  name: string;
  type: string;
  city: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/statistics`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`);
  }
}

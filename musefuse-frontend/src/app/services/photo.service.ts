import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

interface PhotoResponse {
  error: boolean;
  data: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post(`${environment.apiUrl}/upload`, formData, { headers });
  }

  getPhotos(): Observable<any[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<PhotoResponse>(`${environment.apiUrl}/photos`, { headers })
      .pipe(
        map(response => response.data)
      );
  }

  deletePhoto(filename: string): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.delete(`${environment.apiUrl}/photos/${filename}`, { headers });
  }

  getUserPhotos(): Observable<any[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any>(`${environment.apiUrl}/photos/user`, { headers })
      .pipe(
        map(response => response.data)
      );
  }
} 
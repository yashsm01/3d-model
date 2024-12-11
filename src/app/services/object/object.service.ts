import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
@Injectable({
  providedIn: 'root',
})
export class ObjectService {
  private apiUrl = 'http://localhost:3000/api/objects';
  public envUrl = 'http://localhost:3000/models';
  constructor(private http: HttpClient) {}

  getModels(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}

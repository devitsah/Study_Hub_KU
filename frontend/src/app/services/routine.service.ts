import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { Routine } from '../models/routine.model';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly base = '/api/routine';

  constructor(private http: HttpClient) {}

  /**
   * Retries every 3s, indefinitely, so that if this loads before the Flask
   * server is up it self-heals as soon as the backend becomes reachable
   * instead of failing once and staying empty forever.
   */
  getRoutine(): Observable<Routine> {
    return this.http.get<Routine>(this.base).pipe(retry({ delay: 3000 }));
  }

  saveRoutine(routine: Routine): Observable<Routine> {
    return this.http.put<Routine>(this.base, routine);
  }
}

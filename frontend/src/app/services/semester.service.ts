import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { Semester } from '../models/semester.model';

@Injectable({ providedIn: 'root' })
export class SemesterService {
  private readonly base = '/api/semesters';

  constructor(private http: HttpClient) {}

  /** Retries every 3s indefinitely -- see RoutineService.getRoutine for why. */
  getSemesters(): Observable<Semester[]> {
    return this.http.get<Semester[]>(this.base).pipe(retry({ delay: 3000 }));
  }
}

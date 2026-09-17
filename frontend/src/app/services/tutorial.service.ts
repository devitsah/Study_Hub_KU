import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { TutorialSubject } from '../models/tutorial.model';

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly base = '/api/tutorials';

  constructor(private http: HttpClient) {}

  getSubjects(): Observable<{ subjects: TutorialSubject[] }> {
    return this.http.get<{ subjects: TutorialSubject[] }>(this.base).pipe(retry({ delay: 3000 }));
  }
}

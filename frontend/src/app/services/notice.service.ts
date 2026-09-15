import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, shareReplay, catchError, of } from 'rxjs';
import { NoticeResponse } from '../models/notice.model';

const POLL_INTERVAL_MS = 60_000; // matches backend's 60s refresh cycle
const QUICK_RETRY_MS = 5_000; // used only while the backend is unreachable

function unreachableResponse(): NoticeResponse {
  return {
    notices: [],
    lastUpdated: null,
    error: 'Cannot reach the backend at /api. Is the Flask server running on port 5000?',
    refreshIntervalSeconds: 60,
  };
}

@Injectable({ providedIn: 'root' })
export class NoticeService {
private readonly base = 'https://study-hub-ku-2.onrender.com/api/notices';

  /**
   * Emits the notice list immediately, then again every 60 seconds.
   * A failed request (e.g. the Flask server hasn't started yet) never kills
   * the stream -- it's caught and turned into an "unreachable" result, and
   * the next tick (60s, or 5s if we're currently failing) tries again.
   */
  readonly notices$: Observable<NoticeResponse> = timer(0, POLL_INTERVAL_MS).pipe(
    switchMap(() => this.fetchWithFastRetry()),
    shareReplay(1)
  );

  constructor(private http: HttpClient) {}

  private fetchWithFastRetry(): Observable<NoticeResponse> {
    return this.http.get<NoticeResponse>(this.base).pipe(
      catchError(() =>
        // Backend not up yet / network hiccup: try again quickly instead of
        // waiting the full 60s poll interval, but still never throw.
        timer(QUICK_RETRY_MS).pipe(
          switchMap(() => this.http.get<NoticeResponse>(this.base)),
          catchError(() => of(unreachableResponse()))
        )
      )
    );
  }

  forceRefresh(): Observable<NoticeResponse> {
    return this.http.post<NoticeResponse>(`${this.base}/refresh`, {}).pipe(
      catchError(() => of(unreachableResponse()))
    );
  }
}

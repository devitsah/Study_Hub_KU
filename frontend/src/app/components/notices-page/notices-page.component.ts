import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NoticeService } from '../../services/notice.service';
import { Notice } from '../../models/notice.model';

@Component({
  selector: 'app-notices-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card panel">
      <div class="panel-head">
        <h2>🔔 All Notices <span class="muted">from Kathmandu University</span></h2>
        <div class="head-actions">
          <span class="live-dot" [class.stale]="error"></span>
          <span class="refresh-label">Auto-refreshes every 60s &middot; updated {{ lastUpdated ? 'recently' : '' }}</span>
          <button class="btn btn-ghost" (click)="refresh()">↻ Refresh now</button>
        </div>
      </div>

      <input class="search-box" type="text" placeholder="Filter notices…" [(ngModel)]="query" />

      <div *ngIf="loading" class="empty-state">Loading notices…</div>
      <div *ngIf="!loading && filtered().length === 0" class="empty-state">No matching notices.</div>

      <ul class="notice-list">
        <li *ngFor="let n of filtered()">
          <div class="notice-thumb" [style.backgroundImage]="n.image ? 'url(' + n.image + ')' : null">
            <span *ngIf="!n.image">📄</span>
          </div>
          <div class="notice-body">
            <span class="notice-date" *ngIf="n.date">{{ n.date }}</span>
            <a class="notice-title" [href]="n.link" target="_blank" rel="noopener">{{ n.title }}</a>
          </div>
          <a class="notice-arrow" [href]="n.link" target="_blank" rel="noopener">›</a>
        </li>
      </ul>
    </div>
  `,
  styleUrls: ['../dashboard/dashboard.component.css'],
})
export class NoticesPageComponent implements OnInit, OnDestroy {
  notices: Notice[] = [];
  loading = true;
  error: string | null = null;
  lastUpdated: string | null = null;
  query = '';
  private sub?: Subscription;

  constructor(private noticeService: NoticeService) {}

  ngOnInit(): void {
    this.sub = this.noticeService.notices$.subscribe((res) => {
      this.notices = res.notices;
      this.lastUpdated = res.lastUpdated;
      this.error = res.error;
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  refresh(): void {
    this.loading = true;
    this.noticeService.forceRefresh().subscribe((res) => {
      this.notices = res.notices;
      this.lastUpdated = res.lastUpdated;
      this.error = res.error;
      this.loading = false;
    });
  }

  filtered(): Notice[] {
    if (!this.query.trim()) return this.notices;
    const q = this.query.toLowerCase();
    return this.notices.filter((n) => n.title.toLowerCase().includes(q));
  }
}

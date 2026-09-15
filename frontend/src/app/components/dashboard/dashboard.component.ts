import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { NoticeService } from '../../services/notice.service';
import { RoutineService } from '../../services/routine.service';
import { SemesterService } from '../../services/semester.service';
import { Notice } from '../../models/notice.model';
import { Routine, RoutineClass } from '../../models/routine.model';
import { Semester } from '../../models/semester.model';

type Cell =
  | { type: 'empty' }
  | { type: 'covered' }
  | { type: 'class'; cls: RoutineClass };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  notices: Notice[] = [];
  noticesLoading = true;
  noticesError: string | null = null;
  lastUpdated: string | null = null;
  secondsToNextRefresh = 60;

  routine: Routine | null = null;
  grid: Record<string, Cell[]> = {};

  semesters: Semester[] = [];

  private subs: Subscription[] = [];
  private countdownHandle: any;

  constructor(
    private noticeService: NoticeService,
    private routineService: RoutineService,
    private semesterService: SemesterService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.noticeService.notices$.subscribe({
        next: (res) => {
          this.notices = res.notices;
          this.lastUpdated = res.lastUpdated;
          this.noticesError = res.error;
          this.noticesLoading = false;
          this.secondsToNextRefresh = res.refreshIntervalSeconds || 60;
        },
        error: () => {
          this.noticesLoading = false;
          this.noticesError = 'Could not reach the server.';
        },
      })
    );

    this.subs.push(
      this.routineService.getRoutine().subscribe((routine) => {
        this.routine = routine;
        this.grid = this.buildGrid(routine);
      })
    );

    this.subs.push(
      this.semesterService.getSemesters().subscribe((sems) => (this.semesters = sems))
    );

    this.countdownHandle = setInterval(() => {
      this.secondsToNextRefresh = this.secondsToNextRefresh > 0 ? this.secondsToNextRefresh - 1 : 60;
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    clearInterval(this.countdownHandle);
  }

  refreshNow(): void {
    this.noticesLoading = true;
    this.noticeService.forceRefresh().subscribe((res) => {
      this.notices = res.notices;
      this.lastUpdated = res.lastUpdated;
      this.noticesError = res.error;
      this.noticesLoading = false;
      this.secondsToNextRefresh = res.refreshIntervalSeconds || 60;
    });
  }

  asClass(cell: Cell): RoutineClass {
    return (cell as { type: 'class'; cls: RoutineClass }).cls;
  }

  openSemester(sem: Semester): void {
    if (sem.driveLink) {
      window.open(sem.driveLink, '_blank', 'noopener');
    }
  }

  timeAgo(iso: string | null): string {
    if (!iso) return '—';
    const diffMs = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }

  private buildGrid(routine: Routine): Record<string, Cell[]> {
    const grid: Record<string, Cell[]> = {};
    for (const day of routine.days) {
      grid[day] = new Array(routine.slots.length).fill(null).map(() => ({ type: 'empty' } as Cell));
    }
    for (const cls of routine.classes) {
      const col = grid[cls.day];
      if (!col) continue;
      col[cls.startSlot] = { type: 'class', cls };
      for (let i = 1; i < cls.span; i++) {
        if (cls.startSlot + i < col.length) {
          col[cls.startSlot + i] = { type: 'covered' };
        }
      }
    }
    return grid;
  }
}

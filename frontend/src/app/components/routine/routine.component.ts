import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoutineService } from '../../services/routine.service';
import { Routine, RoutineClass } from '../../models/routine.model';

type Cell =
  | { type: 'empty' }
  | { type: 'covered' }
  | { type: 'class'; cls: RoutineClass };

const PALETTE = ['#2e7d32', '#c2185b', '#8e24aa', '#43a047', '#a1665e', '#1565c0', '#4d9a9a', '#f9a825', '#6d4c41', '#00838f'];

@Component({
  selector: 'app-routine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routine.component.html',
  styleUrls: ['./routine.component.css'],
})
export class RoutineComponent implements OnInit {
  routine: Routine | null = null;
  grid: Record<string, Cell[]> = {};
  editMode = false;
  saving = false;
  dirty = false;
  toast: string | null = null;

  // modal state
  showModal = false;
  isNewClass = false;
  form: RoutineClass = this.blankClass();

  constructor(private routineService: RoutineService) {}

  ngOnInit(): void {
    this.routineService.getRoutine().subscribe((r) => {
      this.routine = r;
      this.rebuildGrid();
    });
  }

  // ---------- grid ----------
  private rebuildGrid(): void {
    if (!this.routine) return;
    const grid: Record<string, Cell[]> = {};
    for (const day of this.routine.days) {
      grid[day] = new Array(this.routine.slots.length).fill(null).map(() => ({ type: 'empty' } as Cell));
    }
    for (const cls of this.routine.classes) {
      const col = grid[cls.day];
      if (!col) continue;
      col[cls.startSlot] = { type: 'class', cls };
      for (let i = 1; i < cls.span; i++) {
        if (cls.startSlot + i < col.length) col[cls.startSlot + i] = { type: 'covered' };
      }
    }
    this.grid = grid;
  }

  asClass(cell: Cell): RoutineClass {
    return (cell as { type: 'class'; cls: RoutineClass }).cls;
  }

  // ---------- edit mode ----------
  toggleEditMode(): void {
    this.editMode = !this.editMode;
  }

  onSlotLabelChange(): void {
    this.dirty = true;
  }

  addSlot(): void {
    if (!this.routine) return;
    const nextLabel = 'New Slot';
    this.routine.slots.push(nextLabel);
    this.rebuildGrid();
    this.dirty = true;
  }

  removeSlot(index: number): void {
    if (!this.routine) return;
    const usedHere = this.routine.classes.some(
      (c) => c.startSlot === index || (c.startSlot < index && c.startSlot + c.span > index)
    );
    if (usedHere) {
      this.showToast('Remove or move the class in that slot first.');
      return;
    }
    this.routine.slots.splice(index, 1);
    // shift down startSlot for classes after the removed slot
    this.routine.classes.forEach((c) => {
      if (c.startSlot > index) c.startSlot -= 1;
    });
    this.rebuildGrid();
    this.dirty = true;
  }

  // ---------- cell click -> modal ----------
  onCellClick(day: string, slotIndex: number, cell: Cell): void {
    if (!this.editMode) return;
    if (cell.type === 'covered') return;

    if (cell.type === 'class') {
      this.isNewClass = false;
      this.form = { ...cell.cls };
    } else {
      this.isNewClass = true;
      this.form = this.blankClass();
      this.form.day = day;
      this.form.startSlot = slotIndex;
      this.form.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveClassForm(): void {
    if (!this.routine) return;
    if (!this.form.code.trim()) {
      this.showToast('Subject code is required.');
      return;
    }
    const maxSpan = this.routine.slots.length - this.form.startSlot;
    if (this.form.span < 1) this.form.span = 1;
    if (this.form.span > maxSpan) this.form.span = maxSpan;

    if (this.isNewClass) {
      this.form.id = 'c' + Date.now();
      this.routine.classes.push({ ...this.form });
    } else {
      const idx = this.routine.classes.findIndex((c) => c.id === this.form.id);
      if (idx > -1) this.routine.classes[idx] = { ...this.form };
    }
    this.dirty = true;
    this.showModal = false;
    this.rebuildGrid();
  }

  deleteClassForm(): void {
    if (!this.routine || this.isNewClass) return;
    this.routine.classes = this.routine.classes.filter((c) => c.id !== this.form.id);
    this.dirty = true;
    this.showModal = false;
    this.rebuildGrid();
  }

  private blankClass(): RoutineClass {
    return { id: '', day: 'Mon', startSlot: 0, span: 1, code: '', teacher: '', room: '', color: PALETTE[0] };
  }

  // ---------- persistence ----------
  saveAll(): void {
    if (!this.routine) return;
    this.saving = true;
    this.routineService.saveRoutine(this.routine).subscribe({
      next: (r) => {
        this.routine = r;
        this.saving = false;
        this.dirty = false;
        this.showToast('Routine saved ✓');
      },
      error: () => {
        this.saving = false;
        this.showToast('Could not save — check the backend is running.');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast = msg;
    setTimeout(() => (this.toast = null), 3000);
  }
}

export interface RoutineClass {
  id: string;
  day: string;
  startSlot: number;
  span: number;
  code: string;
  teacher: string;
  room: string;
  color: string;
}

export interface Routine {
  programTitle: string;
  semesterLabel: string;
  days: string[];
  slots: string[];
  classes: RoutineClass[];
  lastUpdated: string | null;
}

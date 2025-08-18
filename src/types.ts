export type Availability = "weekdays" | "weekends" | "both";

export interface Member {
  id: string;
  name: string;
  instruments: string[];
  availability: Availability;
  targetCount: number;
  assignedCount: number;
  canSingAndPlay?: boolean;
}

export interface AssignmentSlot {
  id: string;
  instrument: string;
  memberId?: string;
}

export interface Schedule {
  id: string;
  date: string; // ISO yyyy-mm-dd
  requiredInstruments: string[];
  assignments: AssignmentSlot[];
  status: "empty" | "partial" | "complete";
  issues: string[];
}



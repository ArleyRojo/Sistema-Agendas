// src/domain/entities.ts

export type TaskPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';

export type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

export type CommitmentStatus = 'PROGRAMADO' | 'CONFIRMADO' | 'CANCELADO';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  dueDate: Date;
  priority?: TaskPriority;
  assignedTo?: string;
}

export interface Commitment {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  attendees: string[]; // RFC 5322 validated emails
  location?: string;
  status: CommitmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleCommitmentDTO {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  attendees: string[];
  location?: string;
  status?: CommitmentStatus;
}


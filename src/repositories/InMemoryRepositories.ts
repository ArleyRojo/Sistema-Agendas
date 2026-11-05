// src/repositories/InMemoryRepositories.ts
import { Task, Commitment } from '../domain/entities';
import { ITaskRepository } from './ITaskRepository';
import { ICommitmentRepository } from './ICommitmentRepository';

export class InMemoryTaskRepository implements ITaskRepository {
  private tasks: Map<string, Task> = new Map();

  constructor(initialTasks: Task[] = []) {
    initialTasks.forEach(task => this.tasks.set(task.id, { ...task }));
  }

  async findById(id: string): Promise<Task | null> {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  async findAll(): Promise<Task[]> {
    return Array.from(this.tasks.values()).map(t => ({ ...t }));
  }

  async findPending(): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'PENDIENTE')
      .map(t => ({ ...t }));
  }

  async save(task: Task): Promise<Task> {
    const clone = { ...task };
    this.tasks.set(clone.id, clone);
    return { ...clone };
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  clear(): void {
    this.tasks.clear();
  }
}

export class InMemoryCommitmentRepository implements ICommitmentRepository {
  private commitments: Map<string, Commitment> = new Map();

  constructor(initialCommitments: Commitment[] = []) {
    initialCommitments.forEach(c => this.commitments.set(c.id, { ...c }));
  }

  async findById(id: string): Promise<Commitment | null> {
    const c = this.commitments.get(id);
    return c ? { ...c } : null;
  }

  async findAll(): Promise<Commitment[]> {
    return Array.from(this.commitments.values()).map(c => ({ ...c }));
  }

  async findByDateRange(start: Date, end: Date): Promise<Commitment[]> {
    return Array.from(this.commitments.values())
      .filter(c => c.startDate < end && c.endDate > start)
      .map(c => ({ ...c }));
  }

  async save(commitment: Commitment): Promise<Commitment> {
    const clone = { ...commitment };
    this.commitments.set(clone.id, clone);
    return { ...clone };
  }

  async delete(id: string): Promise<boolean> {
    return this.commitments.delete(id);
  }

  clear(): void {
    this.commitments.clear();
  }
}


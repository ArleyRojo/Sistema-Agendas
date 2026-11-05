// src/repositories/ITaskRepository.ts
import { Task } from '../domain/entities';

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  save(task: Task): Promise<Task>;
  delete(id: string): Promise<boolean>;
  findPending(): Promise<Task[]>;
}


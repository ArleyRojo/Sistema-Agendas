// src/ui/app.ts
/**
 * UI Application Bootstrap and Event Wiring
 * Executive Precision Productivity Suite
 */
import { TaskService } from '../services/TaskService';
import { CommitmentService } from '../services/CommitmentService';
import { InMemoryTaskRepository, InMemoryCommitmentRepository } from '../repositories/InMemoryRepositories';

export class AppUI {
  private taskService: TaskService;
  private commitmentService: CommitmentService;

  constructor() {
    const taskRepo = new InMemoryTaskRepository();
    const commRepo = new InMemoryCommitmentRepository();
    this.taskService = new TaskService(taskRepo);
    this.commitmentService = new CommitmentService(commRepo);
  }

  public getServices() {
    return {
      taskService: this.taskService,
      commitmentService: this.commitmentService
    };
  }
}


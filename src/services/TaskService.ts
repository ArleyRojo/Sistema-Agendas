// src/services/TaskService.ts
import { Task, CreateTaskDTO, TaskStatus } from '../domain/entities';
import { TaskValidationException, IllegalStateException } from '../domain/exceptions';
import { ITaskRepository } from '../repositories/ITaskRepository';

export class TaskService {
  constructor(private taskRepository: ITaskRepository) {}

  /**
   * RN-01: Fecha de vencimiento futura.
   * No permite crear ni actualizar tareas con fecha en el pasado.
   */
  async createTask(dto: CreateTaskDTO, currentDate: Date = new Date()): Promise<Task> {
    if (!dto.dueDate || dto.dueDate.getTime() < currentDate.getTime()) {
      throw new TaskValidationException('La fecha de vencimiento no puede ser en el pasado');
    }

    if (!dto.title || dto.title.trim() === '') {
      throw new TaskValidationException('El título de la tarea es requerido');
    }

    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      dueDate: new Date(dto.dueDate),
      priority: dto.priority || 'MEDIA',
      status: 'PENDIENTE',
      assignedTo: dto.assignedTo?.trim(),
      createdAt: new Date(currentDate),
      updatedAt: new Date(currentDate)
    };

    return await this.taskRepository.save(newTask);
  }

  /**
   * RN-02: Estado terminal inmutable.
   * Una tarea COMPLETADA o CANCELADA no puede revertirse a EN_PROCESO o PENDIENTE.
   */
  async updateStatus(id: string, newStatus: TaskStatus): Promise<Task> {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new Error(`Tarea con id ${id} no encontrada`);
    }

    const isTerminal = task.status === 'COMPLETADA' || task.status === 'CANCELADA';
    const isReverting = newStatus === 'PENDIENTE' || newStatus === 'EN_PROCESO';

    if (isTerminal && isReverting) {
      throw new IllegalStateException('No se puede reabrir una tarea completada');
    }

    task.status = newStatus;
    task.updatedAt = new Date();
    return await this.taskRepository.save(task);
  }

  /**
   * TDD-T04: Retorna sólo tareas PENDIENTES cuya fecha de vencimiento sea anterior a la fecha de referencia.
   */
  async getPendingTasksOverdue(referenceDate: Date = new Date()): Promise<Task[]> {
    const allPending = await this.taskRepository.findPending();
    return allPending.filter(task => task.dueDate.getTime() < referenceDate.getTime());
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.taskRepository.findAll();
  }

  async getTaskById(id: string): Promise<Task | null> {
    return await this.taskRepository.findById(id);
  }

  async deleteTask(id: string): Promise<boolean> {
    return await this.taskRepository.delete(id);
  }
}


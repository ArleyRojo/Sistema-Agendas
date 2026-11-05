// tests/unit/TaskService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from '../../src/services/TaskService';
import { InMemoryTaskRepository } from '../../src/repositories/InMemoryRepositories';
import { TaskValidationException, IllegalStateException } from '../../src/domain/exceptions';
import { Task } from '../../src/domain/entities';

describe('TaskService - Reglas de Negocio TDD', () => {
  let taskRepository: InMemoryTaskRepository;
  let taskService: TaskService;

  beforeEach(() => {
    taskRepository = new InMemoryTaskRepository();
    taskService = new TaskService(taskRepository);
  });

  // TDD-T01: RN-01
  it('TDD-T01: createTask_conFechaPasada_lanzaTaskValidationException', async () => {
    const fixedNow = new Date('2026-11-05T12:00:00Z');
    const pastDate = new Date('2026-11-04T12:00:00Z'); // Ayer

    await expect(
      taskService.createTask(
        {
          title: 'Auditoría de Seguridad Q4',
          dueDate: pastDate,
          priority: 'ALTA'
        },
        fixedNow
      )
    ).rejects.toThrow(TaskValidationException);

    await expect(
      taskService.createTask(
        {
          title: 'Auditoría de Seguridad Q4',
          dueDate: pastDate
        },
        fixedNow
      )
    ).rejects.toThrow('La fecha de vencimiento no puede ser en el pasado');
  });

  // TDD-T02: RN-01 & Creación válida
  it('TDD-T02: createTask_conDatosValidos_creaTareaConEstadoPendiente', async () => {
    const fixedNow = new Date('2026-11-05T12:00:00Z');
    const futureDate = new Date('2026-11-10T18:00:00Z');

    const created = await taskService.createTask(
      {
        title: 'Presentación Junta Directiva',
        description: 'Revisión presupuestal anual',
        dueDate: futureDate,
        priority: 'CRÍTICA',
        assignedTo: 'Ing. Morales'
      },
      fixedNow
    );

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Presentación Junta Directiva');
    expect(created.status).toBe('PENDIENTE');
    expect(created.priority).toBe('CRÍTICA');
    expect(created.assignedTo).toBe('Ing. Morales');

    const saved = await taskRepository.findById(created.id);
    expect(saved).not.toBeNull();
    expect(saved?.status).toBe('PENDIENTE');
  });

  // TDD-T03: RN-02
  it('TDD-T03: updateTaskStatus_tareaCompletadaHaciaEnProceso_lanzaIllegalStateException', async () => {
    const fixedNow = new Date('2026-11-05T12:00:00Z');
    const futureDate = new Date('2026-11-15T10:00:00Z');

    const task = await taskService.createTask(
      {
        title: 'Despliegue a Producción v2.4',
        dueDate: futureDate
      },
      fixedNow
    );

    // Completar la tarea
    await taskService.updateStatus(task.id, 'COMPLETADA');

    // Intentar revertir a EN_PROCESO debe lanzar IllegalStateException
    await expect(taskService.updateStatus(task.id, 'EN_PROCESO')).rejects.toThrow(
      IllegalStateException
    );
    await expect(taskService.updateStatus(task.id, 'EN_PROCESO')).rejects.toThrow(
      'No se puede reabrir una tarea completada'
    );

    // Intentar revertir a PENDIENTE también debe fallar
    await expect(taskService.updateStatus(task.id, 'PENDIENTE')).rejects.toThrow(
      IllegalStateException
    );
  });

  // TDD-T04: RN-01 / Telemetría de vencidas
  it('TDD-T04: getPendingTasksOverdue_retornaSoloTareasPendientesConFechaPasada', async () => {
    const referenceDate = new Date('2026-11-05T12:00:00Z');

    const overdueTask: Task = {
      id: 'task_overdue',
      title: 'Reporte Mensual Octubre',
      dueDate: new Date('2026-11-01T10:00:00Z'), // Pasada
      priority: 'ALTA',
      status: 'PENDIENTE',
      createdAt: new Date('2026-10-25T10:00:00Z'),
      updatedAt: new Date('2026-10-25T10:00:00Z')
    };

    const futureTask: Task = {
      id: 'task_future',
      title: 'Revisión Arquitectura',
      dueDate: new Date('2026-11-12T10:00:00Z'), // Futura
      priority: 'MEDIA',
      status: 'PENDIENTE',
      createdAt: new Date('2026-11-02T10:00:00Z'),
      updatedAt: new Date('2026-11-02T10:00:00Z')
    };

    const completedOverdueTask: Task = {
      id: 'task_completed_overdue',
      title: 'Cierre Fiscal Pasado',
      dueDate: new Date('2026-11-02T10:00:00Z'), // Pasada pero COMPLETADA
      priority: 'CRÍTICA',
      status: 'COMPLETADA',
      createdAt: new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date('2026-11-01T10:00:00Z')
    };

    await taskRepository.save(overdueTask);
    await taskRepository.save(futureTask);
    await taskRepository.save(completedOverdueTask);

    const overdueList = await taskService.getPendingTasksOverdue(referenceDate);

    expect(overdueList.length).toBe(1);
    expect(overdueList[0].id).toBe('task_overdue');
    expect(overdueList[0].title).toBe('Reporte Mensual Octubre');
  });
});


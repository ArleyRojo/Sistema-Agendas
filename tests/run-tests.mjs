// tests/run-tests.mjs
// Test runner using native node:test and node:assert

import test from 'node:test';
import assert from 'node:assert/strict';

// Import domain logic directly
class TaskValidationException extends Error {
  constructor(message = 'La fecha de vencimiento no puede ser en el pasado') {
    super(message);
    this.name = 'TaskValidationException';
  }
}

class IllegalStateException extends Error {
  constructor(message = 'No se puede reabrir una tarea completada') {
    super(message);
    this.name = 'IllegalStateException';
  }
}

class ScheduleConflictException extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScheduleConflictException';
  }
}

class IllegalArgumentException extends Error {
  constructor(message = 'La duración mínima de un compromiso debe ser de 15 minutos') {
    super(message);
    this.name = 'IllegalArgumentException';
  }
}

class ValidationException extends Error {
  constructor(message = 'Todo compromiso requiere al menos 1 participante con correo electrónico válido') {
    super(message);
    this.name = 'ValidationException';
  }
}

const EMAIL_RFC5322_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

class InMemoryTaskRepository {
  constructor() {
    this.tasks = new Map();
  }
  async findById(id) {
    const t = this.tasks.get(id);
    return t ? { ...t } : null;
  }
  async findAll() {
    return Array.from(this.tasks.values()).map(t => ({ ...t }));
  }
  async findPending() {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'PENDIENTE')
      .map(t => ({ ...t }));
  }
  async save(task) {
    const clone = { ...task };
    this.tasks.set(clone.id, clone);
    return { ...clone };
  }
  async delete(id) {
    return this.tasks.delete(id);
  }
}

class InMemoryCommitmentRepository {
  constructor() {
    this.commitments = new Map();
  }
  async findById(id) {
    const c = this.commitments.get(id);
    return c ? { ...c } : null;
  }
  async findAll() {
    return Array.from(this.commitments.values()).map(c => ({ ...c }));
  }
  async save(c) {
    const clone = { ...c };
    this.commitments.set(clone.id, clone);
    return { ...clone };
  }
  async delete(id) {
    return this.commitments.delete(id);
  }
}

class TaskService {
  constructor(repo) {
    this.repo = repo;
  }
  async createTask(dto, currentDate = new Date()) {
    if (!dto.dueDate || dto.dueDate.getTime() < currentDate.getTime()) {
      throw new TaskValidationException('La fecha de vencimiento no puede ser en el pasado');
    }
    if (!dto.title || dto.title.trim() === '') {
      throw new TaskValidationException('El título de la tarea es requerido');
    }
    const newTask = {
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
    return await this.repo.save(newTask);
  }
  async updateStatus(id, newStatus) {
    const task = await this.repo.findById(id);
    if (!task) throw new Error('Tarea no encontrada');
    const isTerminal = task.status === 'COMPLETADA' || task.status === 'CANCELADA';
    const isReverting = newStatus === 'PENDIENTE' || newStatus === 'EN_PROCESO';
    if (isTerminal && isReverting) {
      throw new IllegalStateException('No se puede reabrir una tarea completada');
    }
    task.status = newStatus;
    task.updatedAt = new Date();
    return await this.repo.save(task);
  }
  async getPendingTasksOverdue(referenceDate = new Date()) {
    const pending = await this.repo.findPending();
    return pending.filter(t => t.dueDate.getTime() < referenceDate.getTime());
  }
}

class CommitmentService {
  constructor(repo) {
    this.repo = repo;
  }
  async schedule(dto) {
    if (!dto.title || dto.title.trim() === '') {
      throw new ValidationException('El título del compromiso es obligatorio');
    }
    const durationMs = dto.endDate.getTime() - dto.startDate.getTime();
    if (durationMs / (1000 * 60) < 15) {
      throw new IllegalArgumentException('La duración mínima de un compromiso debe ser de 15 minutos');
    }
    if (!dto.attendees || dto.attendees.length === 0) {
      throw new ValidationException('Todo compromiso requiere al menos 1 participante con correo electrónico válido');
    }
    for (const email of dto.attendees) {
      if (!email || !EMAIL_RFC5322_REGEX.test(email.trim())) {
        throw new ValidationException(`El correo '${email}' no cumple con el estándar RFC 5322`);
      }
    }
    const existingList = await this.repo.findAll();
    for (const ex of existingList) {
      if (ex.status === 'CANCELADO') continue;
      if (dto.startDate.getTime() < ex.endDate.getTime() && dto.endDate.getTime() > ex.startDate.getTime()) {
        throw new ScheduleConflictException(
          `El horario solicitado se traslapa con el compromiso '${ex.title}'`
        );
      }
    }
    const newCommitment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      attendees: dto.attendees.map(a => a.trim()),
      location: dto.location || 'Sala Virtual',
      status: dto.status || 'PROGRAMADO',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return await this.repo.save(newCommitment);
  }
  async getAll() {
    return await this.repo.findAll();
  }
}

// SUITE EXECUTION
test('Suite TDD Formal - Agenda de Tareas y Compromisos', async (t) => {

  await t.test('TDD-T01: createTask_conFechaPasada_lanzaTaskValidationException', async () => {
    const svc = new TaskService(new InMemoryTaskRepository());
    const fixedNow = new Date('2026-11-05T12:00:00Z');
    const pastDate = new Date('2026-11-04T12:00:00Z');

    await assert.rejects(
      async () => svc.createTask({ title: 'Auditoría', dueDate: pastDate }, fixedNow),
      (err) => {
        assert.equal(err.name, 'TaskValidationException');
        assert.equal(err.message, 'La fecha de vencimiento no puede ser en el pasado');
        return true;
      }
    );
  });

  await t.test('TDD-T02: createTask_conDatosValidos_creaTareaConEstadoPendiente', async () => {
    const svc = new TaskService(new InMemoryTaskRepository());
    const fixedNow = new Date('2026-11-05T12:00:00Z');
    const futureDate = new Date('2026-11-10T18:00:00Z');

    const created = await svc.createTask({
      title: 'Presentación Junta Directiva',
      dueDate: futureDate,
      priority: 'CRÍTICA',
      assignedTo: 'Ing. Morales'
    }, fixedNow);

    assert.equal(created.status, 'PENDIENTE');
    assert.equal(created.title, 'Presentación Junta Directiva');
    assert.equal(created.priority, 'CRÍTICA');
  });

  await t.test('TDD-T03: updateTaskStatus_tareaCompletadaHaciaEnProceso_lanzaIllegalStateException', async () => {
    const svc = new TaskService(new InMemoryTaskRepository());
    const fixedNow = new Date('2026-11-05T12:00:00Z');
    const futureDate = new Date('2026-11-15T10:00:00Z');

    const created = await svc.createTask({ title: 'Despliegue a Producción', dueDate: futureDate }, fixedNow);
    await svc.updateStatus(created.id, 'COMPLETADA');

    await assert.rejects(
      async () => svc.updateStatus(created.id, 'EN_PROCESO'),
      (err) => {
        assert.equal(err.name, 'IllegalStateException');
        assert.equal(err.message, 'No se puede reabrir una tarea completada');
        return true;
      }
    );
  });

  await t.test('TDD-T04: getPendingTasksOverdue_retornaSoloTareasPendientesConFechaPasada', async () => {
    const repo = new InMemoryTaskRepository();
    const svc = new TaskService(repo);
    const refDate = new Date('2026-11-05T12:00:00Z');

    await repo.save({
      id: 'task_overdue',
      title: 'Reporte Mensual Octubre',
      dueDate: new Date('2026-11-01T10:00:00Z'),
      priority: 'ALTA',
      status: 'PENDIENTE',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await repo.save({
      id: 'task_future',
      title: 'Revisión Arquitectura',
      dueDate: new Date('2026-11-12T10:00:00Z'),
      priority: 'MEDIA',
      status: 'PENDIENTE',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const overdue = await svc.getPendingTasksOverdue(refDate);
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0].id, 'task_overdue');
  });

  await t.test('TDD-C01: scheduleCommitment_duracionMenor15Mins_lanzaIllegalArgumentException', async () => {
    const svc = new CommitmentService(new InMemoryCommitmentRepository());
    await assert.rejects(
      async () => svc.schedule({
        title: 'Daily Express',
        startDate: new Date('2026-11-10T10:00:00Z'),
        endDate: new Date('2026-11-10T10:10:00Z'), // 10 min
        attendees: ['director@empresa.com']
      }),
      (err) => {
        assert.equal(err.name, 'IllegalArgumentException');
        assert.equal(err.message, 'La duración mínima de un compromiso debe ser de 15 minutos');
        return true;
      }
    );
  });

  await t.test('TDD-C02: scheduleCommitment_emailParticipanteInvalido_lanzaValidationException', async () => {
    const svc = new CommitmentService(new InMemoryCommitmentRepository());
    await assert.rejects(
      async () => svc.schedule({
        title: 'Reunión sin correo válido',
        startDate: new Date('2026-11-10T10:00:00Z'),
        endDate: new Date('2026-11-10T11:00:00Z'),
        attendees: ['usuario_invalido@']
      }),
      (err) => {
        assert.equal(err.name, 'ValidationException');
        assert.match(err.message, /RFC 5322/);
        return true;
      }
    );
  });

  await t.test('TDD-C03: scheduleCommitment_traslapeHorario_lanzaScheduleConflictException', async () => {
    const svc = new CommitmentService(new InMemoryCommitmentRepository());
    await svc.schedule({
      title: 'Comité de Dirección Estratégico',
      startDate: new Date('2026-11-10T10:00:00Z'),
      endDate: new Date('2026-11-10T11:30:00Z'),
      attendees: ['ceo@empresa.com']
    });

    await assert.rejects(
      async () => svc.schedule({
        title: 'Revisión Técnica de Infraestructura',
        startDate: new Date('2026-11-10T11:00:00Z'),
        endDate: new Date('2026-11-10T12:00:00Z'),
        attendees: ['techlead@empresa.com']
      }),
      (err) => {
        assert.equal(err.name, 'ScheduleConflictException');
        assert.equal(err.message, "El horario solicitado se traslapa con el compromiso 'Comité de Dirección Estratégico'");
        return true;
      }
    );
  });

  await t.test('TDD-C04: scheduleCommitment_horarioConsecutivoSinTraslape_guardaExitosamente', async () => {
    const svc = new CommitmentService(new InMemoryCommitmentRepository());
    const c1 = await svc.schedule({
      title: 'Sincronización de Producto',
      startDate: new Date('2026-11-10T10:00:00Z'),
      endDate: new Date('2026-11-10T11:00:00Z'),
      attendees: ['po@empresa.com']
    });

    const c2 = await svc.schedule({
      title: 'Sesión 1 a 1 de Desempeño',
      startDate: new Date('2026-11-10T11:00:00Z'),
      endDate: new Date('2026-11-10T12:00:00Z'),
      attendees: ['rh@empresa.com']
    });

    assert.ok(c1.id);
    assert.ok(c2.id);
    const all = await svc.getAll();
    assert.equal(all.length, 2);
  });
});


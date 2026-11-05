// src/domain/exceptions.ts

export class TaskValidationException extends Error {
  constructor(message: string = 'La fecha de vencimiento no puede ser en el pasado') {
    super(message);
    this.name = 'TaskValidationException';
    Object.setPrototypeOf(this, TaskValidationException.prototype);
  }
}

export class IllegalStateException extends Error {
  constructor(message: string = 'No se puede reabrir una tarea completada') {
    super(message);
    this.name = 'IllegalStateException';
    Object.setPrototypeOf(this, IllegalStateException.prototype);
  }
}

export class ScheduleConflictException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleConflictException';
    Object.setPrototypeOf(this, ScheduleConflictException.prototype);
  }
}

export class IllegalArgumentException extends Error {
  constructor(message: string = 'La duración mínima de un compromiso debe ser de 15 minutos') {
    super(message);
    this.name = 'IllegalArgumentException';
    Object.setPrototypeOf(this, IllegalArgumentException.prototype);
  }
}

export class ValidationException extends Error {
  constructor(message: string = 'Todo compromiso requiere al menos 1 participante con correo electrónico válido') {
    super(message);
    this.name = 'ValidationException';
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}


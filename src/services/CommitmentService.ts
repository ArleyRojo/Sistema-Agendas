// src/services/CommitmentService.ts
import { Commitment, ScheduleCommitmentDTO } from '../domain/entities';
import {
  ScheduleConflictException,
  IllegalArgumentException,
  ValidationException
} from '../domain/exceptions';
import { ICommitmentRepository } from '../repositories/ICommitmentRepository';

// RFC 5322 simplified standard compliant pattern
const EMAIL_RFC5322_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export class CommitmentService {
  constructor(private commitmentRepository: ICommitmentRepository) {}

  /**
   * RN-05: Validación RFC 5322 de asistentes.
   * Todo compromiso requiere al menos 1 participante y todos los correos deben ser válidos.
   */
  private validateAttendees(attendees: string[]): void {
    if (!attendees || attendees.length === 0) {
      throw new ValidationException('Todo compromiso requiere al menos 1 participante con correo electrónico válido');
    }

    for (const email of attendees) {
      const cleanEmail = email.trim();
      if (!cleanEmail || !EMAIL_RFC5322_REGEX.test(cleanEmail)) {
        throw new ValidationException(`El correo '${email}' no cumple con el estándar RFC 5322`);
      }
    }
  }

  /**
   * RN-04: Duración mínima 15 minutos.
   * (fechaFin - fechaInicio) >= 15 min.
   */
  private validateDuration(start: Date, end: Date): void {
    const durationMs = end.getTime() - start.getTime();
    const durationMins = durationMs / (1000 * 60);

    if (durationMins < 15) {
      throw new IllegalArgumentException('La duración mínima de un compromiso debe ser de 15 minutos');
    }
  }

  /**
   * RN-03: Detección de colisiones para compromisos PROGRAMADO o CONFIRMADO.
   * Fórmula de intervalo: (NuevoIni < ExistFin) && (NuevoFin > ExistIni)
   * Los intervalos consecutivos adyacentes (ej. 10:00-11:00 y 11:00-12:00) son válidos.
   */
  async hasConflict(start: Date, end: Date, excludeId?: string): Promise<{ hasConflict: boolean; conflictingCommitment?: Commitment }> {
    const existingList = await this.commitmentRepository.findAll();

    for (const existing of existingList) {
      if (excludeId && existing.id === excludeId) {
        continue;
      }
      if (existing.status === 'CANCELADO') {
        continue;
      }

      // Formula: (NuevoIni < ExistFin) && (NuevoFin > ExistIni)
      const overlaps = start.getTime() < existing.endDate.getTime() && end.getTime() > existing.startDate.getTime();
      if (overlaps) {
        return { hasConflict: true, conflictingCommitment: existing };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Agendar compromiso cumpliendo RN-03, RN-04 y RN-05.
   */
  async schedule(dto: ScheduleCommitmentDTO): Promise<Commitment> {
    if (!dto.title || dto.title.trim() === '') {
      throw new ValidationException('El título del compromiso es obligatorio');
    }

    // RN-04: Duración mínima
    this.validateDuration(dto.startDate, dto.endDate);

    // RN-05: Asistentes válidos
    this.validateAttendees(dto.attendees);

    // RN-03: Traslape horario
    const conflictResult = await this.hasConflict(dto.startDate, dto.endDate);
    if (conflictResult.hasConflict && conflictResult.conflictingCommitment) {
      throw new ScheduleConflictException(
        `El horario solicitado se traslapa con el compromiso '${conflictResult.conflictingCommitment.title}'`
      );
    }

    const newCommitment: Commitment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      attendees: dto.attendees.map(a => a.trim()),
      location: dto.location?.trim() || 'Sala Virtual',
      status: dto.status || 'PROGRAMADO',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.commitmentRepository.save(newCommitment);
  }

  async cancel(id: string): Promise<Commitment> {
    const commitment = await this.commitmentRepository.findById(id);
    if (!commitment) {
      throw new Error(`Compromiso con id ${id} no encontrado`);
    }

    commitment.status = 'CANCELADO';
    commitment.updatedAt = new Date();
    return await this.commitmentRepository.save(commitment);
  }

  async getAll(): Promise<Commitment[]> {
    return await this.commitmentRepository.findAll();
  }

  async getById(id: string): Promise<Commitment | null> {
    return await this.commitmentRepository.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    return await this.commitmentRepository.delete(id);
  }
}


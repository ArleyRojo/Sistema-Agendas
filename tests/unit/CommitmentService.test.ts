// tests/unit/CommitmentService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CommitmentService } from '../../src/services/CommitmentService';
import { InMemoryCommitmentRepository } from '../../src/repositories/InMemoryRepositories';
import {
  IllegalArgumentException,
  ValidationException,
  ScheduleConflictException
} from '../../src/domain/exceptions';

describe('CommitmentService - Reglas de Negocio TDD', () => {
  let commitmentRepository: InMemoryCommitmentRepository;
  let commitmentService: CommitmentService;

  beforeEach(() => {
    commitmentRepository = new InMemoryCommitmentRepository();
    commitmentService = new CommitmentService(commitmentRepository);
  });

  // TDD-C01: RN-04 Duración mínima 15 min
  it('TDD-C01: scheduleCommitment_duracionMenor15Mins_lanzaIllegalArgumentException', async () => {
    const start = new Date('2026-11-10T10:00:00Z');
    const endTooShort = new Date('2026-11-10T10:10:00Z'); // 10 minutos de duración

    await expect(
      commitmentService.schedule({
        title: 'Daily Standup Express',
        startDate: start,
        endDate: endTooShort,
        attendees: ['director@empresa.com']
      })
    ).rejects.toThrow(IllegalArgumentException);

    await expect(
      commitmentService.schedule({
        title: 'Daily Standup Express',
        startDate: start,
        endDate: endTooShort,
        attendees: ['director@empresa.com']
      })
    ).rejects.toThrow('La duración mínima de un compromiso debe ser de 15 minutos');
  });

  // TDD-C02: RN-05 RFC 5322 en asistentes
  it('TDD-C02: scheduleCommitment_emailParticipanteInvalido_lanzaValidationException', async () => {
    const start = new Date('2026-11-10T10:00:00Z');
    const end = new Date('2026-11-10T11:00:00Z');

    // Caso 1: Asistentes vacíos
    await expect(
      commitmentService.schedule({
        title: 'Reunión sin invitados',
        startDate: start,
        endDate: end,
        attendees: []
      })
    ).rejects.toThrow(ValidationException);

    // Caso 2: Email inválido
    await expect(
      commitmentService.schedule({
        title: 'Reunión con email roto',
        startDate: start,
        endDate: end,
        attendees: ['usuario_invalido@', 'valido@empresa.com']
      })
    ).rejects.toThrow(ValidationException);

    await expect(
      commitmentService.schedule({
        title: 'Reunión con email sin arroba',
        startDate: start,
        endDate: end,
        attendees: ['correo-sin-formato.com']
      })
    ).rejects.toThrow(/RFC 5322/);
  });

  // TDD-C03: RN-03 Traslape Horario (NuevoIni < ExistFin && NuevoFin > ExistIni)
  it('TDD-C03: scheduleCommitment_traslapeHorario_lanzaScheduleConflictException', async () => {
    // Agendamos compromiso base de 10:00 a 11:30
    await commitmentService.schedule({
      title: 'Comité de Dirección Estratégico',
      startDate: new Date('2026-11-10T10:00:00Z'),
      endDate: new Date('2026-11-10T11:30:00Z'),
      attendees: ['ceo@empresa.com', 'cfo@empresa.com']
    });

    // Intentamos agendar un compromiso que se traslapa de 11:00 a 12:00
    // (NuevoIni 11:00 < ExistFin 11:30) && (NuevoFin 12:00 > ExistIni 10:00) => TRASLAPE
    await expect(
      commitmentService.schedule({
        title: 'Revisión Técnica de Infraestructura',
        startDate: new Date('2026-11-10T11:00:00Z'),
        endDate: new Date('2026-11-10T12:00:00Z'),
        attendees: ['techlead@empresa.com']
      })
    ).rejects.toThrow(ScheduleConflictException);

    await expect(
      commitmentService.schedule({
        title: 'Revisión Técnica de Infraestructura',
        startDate: new Date('2026-11-10T11:00:00Z'),
        endDate: new Date('2026-11-10T12:00:00Z'),
        attendees: ['techlead@empresa.com']
      })
    ).rejects.toThrow("El horario solicitado se traslapa con el compromiso 'Comité de Dirección Estratégico'");
  });

  // TDD-C04: RN-03 Horarios Consecutivos Válidos (Sin traslape)
  it('TDD-C04: scheduleCommitment_horarioConsecutivoSinTraslape_guardaExitosamente', async () => {
    // Compromiso 1: 10:00 a 11:00
    const c1 = await commitmentService.schedule({
      title: 'Sincronización de Producto',
      startDate: new Date('2026-11-10T10:00:00Z'),
      endDate: new Date('2026-11-10T11:00:00Z'),
      attendees: ['po@empresa.com']
    });

    // Compromiso 2 adyacente: 11:00 a 12:00 (NuevoIni == ExistFin => No traslapa porque NuevoIni < ExistFin es FALSE)
    const c2 = await commitmentService.schedule({
      title: 'Sesión 1 a 1 de Desempeño',
      startDate: new Date('2026-11-10T11:00:00Z'),
      endDate: new Date('2026-11-10T12:00:00Z'),
      attendees: ['rh@empresa.com', 'lider@empresa.com']
    });

    expect(c1.id).toBeDefined();
    expect(c2.id).toBeDefined();

    const all = await commitmentService.getAll();
    expect(all.length).toBe(2);
    expect(all.map(c => c.title)).toContain('Sincronización de Producto');
    expect(all.map(c => c.title)).toContain('Sesión 1 a 1 de Desempeño');
  });
});


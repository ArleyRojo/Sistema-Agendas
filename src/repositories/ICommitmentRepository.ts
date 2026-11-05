// src/repositories/ICommitmentRepository.ts
import { Commitment } from '../domain/entities';

export interface ICommitmentRepository {
  findById(id: string): Promise<Commitment | null>;
  findAll(): Promise<Commitment[]>;
  findByDateRange(start: Date, end: Date): Promise<Commitment[]>;
  save(commitment: Commitment): Promise<Commitment>;
  delete(id: string): Promise<boolean>;
}


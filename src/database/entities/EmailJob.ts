import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EmailStatus } from '../../shared/enums/email-status.enum';

export { EmailStatus };

@Entity('emails')
export class EmailJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Chave de idempotencia para prevenir duplicidade de requisicoes
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  idempotencyKey?: string;

  @Column({ type: 'varchar', length: 255 })
  to: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  from: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  // Contador de tentativas realizadas
  @Column({ type: 'int', default: 0 })
  attempts: number;

  // Maximo de tentativas antes de marcar como FAILED
  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  // Mensagem de erro capturada caso o SMTP falhe
  @Column({ type: 'text', nullable: true })
  lastError?: string;

  // ID retornado pelo servidor SMTP para rastreamento
  @Column({ type: 'varchar', length: 150, nullable: true })
  externalMessageId?: string;

  // Metadados extras opcionais
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;
}

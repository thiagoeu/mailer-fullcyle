import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum EmailStatus {
  PENDING = 'PENDING',       // Criado e enfileirado, aguardando o worker pegar
  PROCESSING = 'PROCESSING', // O worker pegou o job e está tentando enviar via SMTP
  SENT = 'SENT',             // Enviado com sucesso pelo provedor
  FAILED = 'FAILED',         // Esgotou o número de tentativas e falhou definitivamente
}

@Entity('emails')
export class EmailJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Chave de idempotência: se o cliente tentar enviar duas vezes o mesmo e-mail,
  // evitamos disparos duplicados verificando esta chave única
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
    default: EmailStatus.PENDING
  })
  status: EmailStatus;

  // Contador de tentativas realizadas
  @Column({ type: 'int', default: 0 })
  attempts: number;

  // Máximo de tentativas antes de marcar como FAILED (Dead-Letter)
  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  // Armazena a mensagem de erro caso o SMTP recuse ou caia
  @Column({ type: 'text', nullable: true })
  lastError?: string;

  // ID retornado pelo servidor SMTP do Google para auditoria/rastreamento
  @Column({ type: 'varchar', length: 150, nullable: true })
  externalMessageId?: string;

  // Metadados extras opcionais (ex: ID do usuário que pediu o envio, tags)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;
}


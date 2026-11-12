import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nome descritivo da aplicacao cliente (ex: "E-commerce Backend")
  @Column({ type: 'varchar', length: 150 })
  name: string;

  // Hash SHA-256 da chave secreta gerada (nunca armazenar o segredo em texto puro)
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  keyHash: string;

  // Prefixo visivel da chave para exibicao em painel (ex: "mls_live_8f3a...")
  @Column({ type: 'varchar', length: 20 })
  keyPrefix: string;

  // Flag booleana que permite desativar/revogar a chave instantaneamente
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Data e hora da ultima vez em que a chave foi utilizada com sucesso
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

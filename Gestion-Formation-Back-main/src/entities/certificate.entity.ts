import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CertificateStatus } from '../common/enums';
import { User } from './user.entity';
import { Formation } from './formation.entity';
import { Session } from './session.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', length: 500 })
  numeroCertificat: string;

  @Column({ type: 'date' })
  dateEmission: Date;

  @Column({ type: 'date', nullable: true })
  dateExpiration: Date;

  @Column({ type: 'enum', enum: CertificateStatus, default: CertificateStatus.EMIS })
  statut: CertificateStatus;

  @Column({ type: 'text', nullable: true })
  qrCode: string;

  @Column({ type: 'text', nullable: true })
  signatureElectronique: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificatUrl: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  noteObtenue: number;

  @Column({ type: 'boolean', default: false })
  isValidated: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  validatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  dateEnvoi: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateTelechargement: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.certificats, { nullable: false })
  user: User;

  @ManyToOne(() => Formation, (formation) => formation.certificats, { nullable: false })
  formation: Formation;

  @ManyToOne(() => Session, (session) => session.certificats, { nullable: false })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

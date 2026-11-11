import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../common/enums';
import { Entreprise } from './entreprise.entity';
import { Session } from './session.entity';
import { Evaluation } from './evaluation.entity';
import { Certificate } from './certificate.entity';
import { Presence } from './presence.entity';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', length: 255, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PARTICIPANT })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshToken: string;

  // --- Profile (common) ---
  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 255 })
  prenom: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  // --- Agent STEG ---
  @Column({ type: 'varchar', length: 255, nullable: true })
  poste: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  departement: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  directionText: string;

  @Column({ type: 'date', nullable: true })
  dateEmbauche: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  identifiant: string;

  // --- Formateur-specific ---
  @Column({ type: 'text', nullable: true })
  qualifications: string;

  @Column({ type: 'text', nullable: true })
  specialites: string;

  @Column({ type: 'text', nullable: true })
  biographie: string;

  @Column({ type: 'simple-json', nullable: true })
  disponibilites: { jour: string; heureDebut: string; heureFin: string }[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  cvUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  programmeUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  modeleCnfcppUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  feuillePresenceUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  attestationUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  noteGlobale: number;

  // --- Relations ---
  @ManyToOne(() => Entreprise, (entreprise) => entreprise.users, { nullable: true })
  entreprise: Entreprise;

  @Column({ type: 'varchar', length: 36, nullable: true })
  cabinetId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cabinetId' })
  cabinet: User;

  @Column({ type: 'varchar', length: 36, nullable: true })
  clonedFromId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  clonedFromCabinetId: string;

  @Column({ type: 'varchar', nullable: true })
  clonedFromCabinetName: string;

  @ManyToMany(() => Session, (session) => session.formateurs)
  sessionsAsFormateur: Session[];

  @ManyToMany(() => Session, (session) => session.participants)
  sessionsAsParticipant: Session[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.formateur)
  evaluationsRecues: Evaluation[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.participant)
  evaluationsDonnees: Evaluation[];

  @OneToMany(() => Certificate, (certificate) => certificate.user)
  certificats: Certificate[];

  @OneToMany(() => Presence, (presence) => presence.user)
  presences: Presence[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

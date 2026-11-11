import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Formation } from './formation.entity';
import { User } from './user.entity';
import { Employe } from './employe.entity';
import { Presence } from './presence.entity';
import { Certificate } from './certificate.entity';
import { Evaluation } from './evaluation.entity';
import { SessionDocument } from './session-document.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'timestamp' })
  dateDebut: Date;

  @Column({ type: 'timestamp' })
  dateFin: Date;

  @Column({ type: 'time', nullable: true })
  heureDebut: string;

  @Column({ type: 'time', nullable: true })
  heureFin: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lieu: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  salle: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cvFormateurUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  factureUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bonCommandeUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  contratUrl: string;

  @Column({ type: 'int', default: 0 })
  nombreParticipants: number;

  @Column({ type: 'int', nullable: true })
  capaciteMax: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  isCancelled: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @ManyToOne(() => Formation, (formation) => formation.sessions, { nullable: false })
  formation: Formation;

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

  @ManyToMany(() => User, (user) => user.sessionsAsParticipant)
  @JoinTable({
    name: 'session_participants',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  participants: User[];

  @ManyToMany(() => Employe)
  @JoinTable({
    name: 'session_employes',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employe_id', referencedColumnName: 'id' },
  })
  employes: Employe[];

  @ManyToMany(() => User, (user) => user.sessionsAsFormateur)
  @JoinTable({
    name: 'session_formateurs',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  formateurs: User[];

  @OneToMany(() => Presence, (presence) => presence.session)
  presences: Presence[];

  @OneToMany(() => Certificate, (certificate) => certificate.session)
  certificats: Certificate[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.session)
  evaluations: Evaluation[];

  @OneToMany(() => SessionDocument, (doc) => doc.session)
  documents: SessionDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

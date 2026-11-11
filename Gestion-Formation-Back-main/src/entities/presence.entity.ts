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
import { PresenceStatus } from '../common/enums';
import { User } from './user.entity';
import { Session } from './session.entity';

@Entity('presences')
export class Presence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'date' })
  datePresence: Date;

  @Column({ type: 'enum', enum: PresenceStatus, default: PresenceStatus.ABSENT })
  statutFormation: PresenceStatus;

  @Column({ type: 'enum', enum: PresenceStatus, default: PresenceStatus.ABSENT })
  statutCantine: PresenceStatus;

  @Column({ type: 'time', nullable: true })
  heureArrivee: string;

  @Column({ type: 'time', nullable: true })
  heureDepart: string;

  @Column({ type: 'text', nullable: true })
  commentaire: string;

  @Column({ type: 'boolean', default: false })
  isJustified: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  justificatifUrl: string;

  // Relations
  @ManyToOne(() => User, (user) => user.presences, { nullable: false })
  user: User;

  @ManyToOne(() => Session, (session) => session.presences, { nullable: false })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

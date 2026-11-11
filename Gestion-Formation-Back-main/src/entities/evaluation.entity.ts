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
import { User } from './user.entity';
import { Session } from './session.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  note: number;

  @Column({ type: 'text', nullable: true })
  commentaire: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteContenu: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  notePedagogie: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteSupports: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteOrganisation: number;

  @Column({ type: 'boolean', default: false })
  recommande: boolean;

  @Column({ type: 'date' })
  dateEvaluation: Date;

  @Column({ type: 'boolean', default: false })
  isValidated: boolean;

  // --- Champs du formulaire détaillé ---

  @Column({ type: 'int', nullable: true })
  noteObjectifClarte: number;

  @Column({ type: 'int', nullable: true })
  noteUtilite: number;

  @Column({ type: 'int', nullable: true })
  noteDureeRythme: number;

  @Column({ type: 'int', nullable: true })
  noteConfortSalle: number;

  @Column({ type: 'int', nullable: true })
  noteEquipements: number;

  @Column({ type: 'int', nullable: true })
  noteMaitriseSujet: number;

  @Column({ type: 'int', nullable: true })
  noteClarteExplications: number;

  @Column({ type: 'int', nullable: true })
  noteAnimation: number;

  @Column({ type: 'int', nullable: true })
  noteCapaciteReponse: number;

  @Column({ type: 'int', nullable: true })
  noteSatisfactionGlobale: number;

  @Column({ type: 'text', nullable: true })
  pointsForts: string;

  @Column({ type: 'text', nullable: true })
  pointsAmeliorer: string;

  @Column({ type: 'int', nullable: true })
  noteCfpStir: number;

  // Relations
  @ManyToOne(() => User, (user) => user.evaluationsRecues, { nullable: false })
  formateur: User;

  @ManyToOne(() => Session, (session) => session.evaluations, { nullable: false })
  session: Session;

  @ManyToOne(() => User, (user) => user.evaluationsDonnees, { nullable: false })
  participant: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

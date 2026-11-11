import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';
import { Session } from './session.entity';
import { StatutPaiement } from '../common/enums/payment-status.enum';

@Entity('inscriptions')
export class Inscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column()
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, { nullable: false })
  session: Session;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  montant: number;

  @Column({ type: 'enum', enum: StatutPaiement, default: StatutPaiement.EN_ATTENTE })
  statutPaiement: StatutPaiement;

  @Column({ default: 'cash' })
  methodePaiement: string;

  @Column({ type: 'timestamp', nullable: true })
  datePaiement: Date;

  @CreateDateColumn()
  dateInscription: Date;
}

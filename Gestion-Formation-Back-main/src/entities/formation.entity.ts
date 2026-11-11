import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FormationType } from '../common/enums';
import { User } from './user.entity';
import { Session } from './session.entity';
import { Certificate } from './certificate.entity';

@Entity('formations')
export class Formation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', length: 500 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  objectifs: string;

  @Column({ type: 'text', nullable: true })
  prerequis: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  categorie: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tarif: number;

  @Column({
    type: 'enum',
    enum: FormationType,
    default: FormationType.CATALOGUE,
  })
  type: FormationType;

  @Column({ type: 'text', nullable: true })
  programme: string;

  @Column({ type: 'int', nullable: true })
  dureeEnHeures: number;

  @Column({ type: 'int', nullable: true })
  dureeEnJours: number;

  @Column({ type: 'int', nullable: true })
  capaciteMax: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  supportsFormation: {
    nom: string;
    url: string;
    type: string;
    sessionId?: string;
  }[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => Session, (session) => session.formation)
  sessions: Session[];

  @OneToMany(() => Certificate, (certificate) => certificate.formation)
  certificats: Certificate[];

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

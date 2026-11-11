import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

@Entity('entreprises')
export class Entreprise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'text', nullable: true })
  localisation: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  codeDirection: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  typeDirection: string;

  // Relations
  @OneToMany(() => User, (user) => user.entreprise)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

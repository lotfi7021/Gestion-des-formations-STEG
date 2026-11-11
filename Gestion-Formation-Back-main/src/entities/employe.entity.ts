import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('employes')
export class Employe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 255 })
  prenom: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  poste: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  departement: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  directionText: string;

  @Column({ type: 'date', nullable: true })
  dateEmbauche: Date;

  @Column({ type: 'varchar', length: 50, unique: true })
  identifiant: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

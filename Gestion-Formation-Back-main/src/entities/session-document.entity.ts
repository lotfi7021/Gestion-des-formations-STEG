import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Session } from './session.entity';
import { User } from './user.entity';

@Entity('session_documents')
export class SessionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'varchar', length: 500 })
  filename: string;

  @Column({ type: 'varchar', length: 500 })
  originalName: string;

  @Column({ type: 'varchar', length: 100 })
  mimetype: string;

  @Column({ type: 'int' })
  size: number;

  @ManyToOne(() => Session, (session) => session.documents, { nullable: false })
  session: Session;

  @Column()
  sessionId: string;

  @ManyToOne(() => User, { nullable: false })
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;
}

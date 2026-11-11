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
import { NotificationType } from '../common/enums';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 500 })
  titre: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  dateEnvoi: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateLecture: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lienAction: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications, { nullable: false })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Formation } from '../entities/formation.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { Entreprise } from '../entities/entreprise.entity';
import { Presence } from '../entities/presence.entity';
import { Certificate } from '../entities/certificate.entity';
import { Notification } from '../entities/notification.entity';
import { Evaluation } from '../entities/evaluation.entity';
import { Employe } from '../entities/employe.entity';
import { Inscription } from '../entities/inscription.entity';
import { SessionDocument } from '../entities/session-document.entity';
import { Signature } from '../entities/signature.entity';
import { DocumentSigne } from '../entities/document-signe.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'gestion_formations',
  entities: [
    Formation,
    Session,
    User,
    Entreprise,
    Presence,
    Certificate,
    Notification,
    Evaluation,
    Employe,
    Inscription,
    SessionDocument,
    Signature,
    DocumentSigne,
  ],

  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};

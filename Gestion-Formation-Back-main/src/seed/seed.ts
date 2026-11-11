import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { CreateUserDto } from '../modules/user/dto/create-user.dto';
import { UserRole } from '../common/enums';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  const admin: CreateUserDto = {
    username: 'admin',
    email: 'admin@steg.tn',
    password: 'admin123',
    role: UserRole.ADMIN,
  };

  const formateur: CreateUserDto = {
    username: 'formateur',
    email: 'formateur@steg.tn',
    password: 'formateur123',
    role: UserRole.FORMATEUR,
  };

  const participant: CreateUserDto = {
    username: 'participant',
    email: 'participant@steg.tn',
    password: 'participant123',
    role: UserRole.PARTICIPANT,
  };

  const users = [admin, formateur, participant];

  for (const u of users) {
    try {
      const created = await userService.create(u);
      console.log(`✓ Utilisateur créé : ${created.email} (${created.role})`);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`~ ${u.email} existe déjà`);
      } else {
        console.error(`✗ ${u.email} : ${err.message}`);
      }
    }
  }

  await app.close();
  console.log('Seed terminé.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Entreprise } from '../entities/entreprise.entity';
import { Formation } from '../entities/formation.entity';
import { UserRole, FormationType } from '../common/enums';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Entreprise)
    private readonly entrepriseRepository: Repository<Entreprise>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedEntreprises();
    await this.seedUsers();
    await this.seedFormations();
  }

  private async seedEntreprises() {
    const directions = [
      
      {
        nom: 'STEG - District de Tunis',
        email: 'district.tunis@steg.tn',
        codeDirection: 'D-TUN',
        typeDirection: 'District',
        localisation: 'Tunis',
      },
    ];

    for (const d of directions) {
      let dir = await this.entrepriseRepository.findOneBy({ email: d.email });
      if (!dir) {
        dir = await this.entrepriseRepository.save(this.entrepriseRepository.create(d));
        console.log(`✓ Direction seedée : ${d.nom}`);
      }
    }
  }

  private async seedUsers() {
    const users = [
      {
        username: 'admin',
        email: 'admin@steg.tn',
        password: '123456',
        role: UserRole.ADMIN,
        nom: 'Admin',
        prenom: 'Super',
        directionText: 'Direction de la Formation',
      },
      {
        username: 'formateur',
        email: 'formateur@steg.tn',
        password: '123456',
        role: UserRole.FORMATEUR,
        nom: 'Ben Salah',
        prenom: 'Ahmed',
        qualifications: 'Formateur certifié habilitations électriques',
        specialites: 'Électricité industrielle, Sécurité HTA',
      },
      {
        username: 'participant',
        email: 'participant@steg.tn',
        password: '123456',
        role: UserRole.PARTICIPANT,
        nom: 'Trabelsi',
        prenom: 'Mohamed',
        poste: 'Technicien de maintenance',
        departement: 'District de Bizerte',
        directionText: 'District de Bizerte',
      },
    ];

    for (const userData of users) {
      let user = await this.userRepository.findOneBy({ email: userData.email });
      if (!user) {
        user = await this.userRepository.findOneBy({ username: userData.username });
      }
      if (!user) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        try {
          user = await this.userRepository.save(
            this.userRepository.create({ ...userData, password: hashedPassword }),
          );
          console.log(`✓ ${userData.role} seedé : ${userData.email}`);
        } catch (err: any) {
          if (err.code === 'ER_DUP_ENTRY') {
            user = await this.userRepository.findOneBy({ email: userData.email })
              || await this.userRepository.findOneBy({ username: userData.username });
            console.log(`✓ ${userData.role} déjà existant : ${userData.email}`);
          } else {
            throw err;
          }
        }
      } else if (!user.isActive) {
        await this.userRepository.update(user.id, { isActive: true });
        console.log(`✓ ${userData.role} activé : ${userData.email}`);
      } else {
        console.log(`✓ ${userData.role} déjà actif : ${userData.email}`);
      }
    }
  }

  private async seedFormations() {
    const formations = [
     
      
      {
        titre: 'BC/CBR - Consignation et Rétablissement',
        description: 'Formation combinée consignation et rétablissement pour techniciens polyvalents.',
        objectifs: 'Maîtriser les procédures de consignation et de rétablissement, assurer la sécurité des interventions.',
        prerequis: 'Habilitation B0/H0V',
        categorie: 'Habilitations Électriques',
        tarif: 2800,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 35,
        dureeEnJours: 5,
        capaciteMax: 8,
      },
      
      
      
      
      {
        titre: 'Hygiène et Sécurité au Travail (HSE)',
        description: 'Formation globale aux principes d\'hygiène, sécurité et environnement en milieu industriel.',
        objectifs: 'Identifier les risques professionnels, appliquer les règles HSE, utiliser les EPI.',
        prerequis: 'Aucun',
        categorie: 'QHSE / Normes',
        tarif: 900,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 7,
        dureeEnJours: 1,
        capaciteMax: 20,
      },
      
      
    ];

    for (const f of formations) {
      const existing = await this.formationRepository.findOneBy({ titre: f.titre });
      if (!existing) {
        await this.formationRepository.save(this.formationRepository.create(f));
        console.log(`✓ Formation seedée : ${f.titre}`);
      }
    }
  }
}

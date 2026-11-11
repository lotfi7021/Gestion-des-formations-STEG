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
        nom: 'STEG - Direction de la Formation et du Développement des Compétences',
        email: 'formation@steg.tn',
        codeDirection: 'DFDC',
        typeDirection: 'Direction Centrale',
        localisation: 'Tunis',
      },
      {
        nom: 'STEG - District de Bizerte',
        email: 'district.bizerte@steg.tn',
        codeDirection: 'D-BIZ',
        typeDirection: 'District',
        localisation: 'Bizerte',
      },
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
      {
        username: 'employe',
        email: 'employe@steg.tn',
        password: '123456',
        role: UserRole.EMPLOYE,
        nom: 'Ben Ali',
        prenom: 'Fatma',
        poste: 'Ingénieur réseau',
        departement: 'Distribution',
        directionText: 'District de Bizerte',
      },
      {
        username: 'cabinet',
        email: 'cabinet@steg.tn',
        password: '123456',
        role: UserRole.CABINET,
        nom: 'Cabinet Habilitation',
        prenom: 'Conseil',
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
        titre: 'B0 - Habilitation Électrique Basse Tension',
        description: 'Formation aux travaux hors tension sous B0. Maîtrise des procédures de consignation et de vérification d\'absence de tension.',
        objectifs: 'Maîtriser les règles de sécurité BT, effectuer les vérifications d\'absence de tension, réaliser les travaux hors tension.',
        prerequis: 'Aptitude médicale,âge minimum 18 ans',
        categorie: 'Habilitations Électriques',
        tarif: 1200,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 14,
        dureeEnJours: 2,
        capaciteMax: 12,
      },
      {
        titre: 'H0V - Habilitation Haute Tension Sans V',
        description: 'Formation aux travaux sous tension HTA/BT sans V. Interventions sur installations électriques haute tension.',
        objectifs: 'Intervenir sur installations HTA, maîtriser les procédures de sécurité haute tension, porter les EPI adaptés.',
        prerequis: 'Habilitation B0, aptitude médicale',
        categorie: 'Habilitations Électriques',
        tarif: 2200,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 28,
        dureeEnJours: 4,
        capaciteMax: 8,
      },
      {
        titre: 'BC - Habilitation Consignation',
        description: 'Formation à la consignation des installations électriques. Procédures de consignation et déconsignation.',
        objectifs: 'Réaliser les opérations de consignation, identifier les points de consignation, rédiger les ordres de consignation.',
        prerequis: 'Habilitation B0/H0V',
        categorie: 'Habilitations Électriques',
        tarif: 1800,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 21,
        dureeEnJours: 3,
        capaciteMax: 10,
      },
      {
        titre: 'BR - Habilitation Rétablissement',
        description: 'Formation au rétablissement des installations électriques après consignation.',
        objectifs: 'Procédures de rétablissement, vérifications post-rétablissement, remise en service sécurisée.',
        prerequis: 'Habilitation BC',
        categorie: 'Habilitations Électriques',
        tarif: 1800,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 14,
        dureeEnJours: 2,
        capaciteMax: 10,
      },
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
        titre: 'Sécurité Générale en Milieu Industriel BT/HTA',
        description: 'Sensibilisation aux risques électriques et aux règles de sécurité dans les installations BT et HTA.',
        objectifs: 'Identifier les risques électriques, appliquer les règles de sécurité, utiliser les EPI.',
        prerequis: 'Aucun',
        categorie: 'Sécurité',
        tarif: 800,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 7,
        dureeEnJours: 1,
        capaciteMax: 20,
      },
      {
        titre: 'Travail en Hauteur et Sauvetage',
        description: 'Formation au travail en hauteur et aux techniques de sauvetage sur installations industrielles.',
        objectifs: 'Maîtriser les équipements de protection antichute, réaliser les procédures de sauvetage.',
        prerequis: 'Aptitude médicale',
        categorie: 'Sécurité',
        tarif: 1500,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 14,
        dureeEnJours: 2,
        capaciteMax: 10,
      },
      {
        titre: 'Module Incendie - Évacuation et Moyens d\'Extinction',
        description: 'Formation aux procédures d\'évacuation et à l\'utilisation des moyens d\'extinction en milieu industriel.',
        objectifs: 'Identifier les types d\'incendie, utiliser les extincteurs, appliquer les procédures d\'évacuation.',
        prerequis: 'Aucun',
        categorie: 'Sécurité',
        tarif: 600,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 7,
        dureeEnJours: 1,
        capaciteMax: 25,
      },
      {
        titre: 'Intervention sur Réseau Gaz Basse Pression',
        description: 'Formation aux interventions sécurisées sur les réseaux de gaz basse pression.',
        objectifs: 'Maîtriser les procédures d\'intervention gaz, détecter les fuites, assurer la sécurité du site.',
        prerequis: 'Habilitation gaz',
        categorie: 'Réseau Gaz',
        tarif: 1800,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 21,
        dureeEnJours: 3,
        capaciteMax: 10,
      },
      {
        titre: 'Détection des Fuites de Gaz',
        description: 'Techniques de détection et localisation des fuites sur les réseaux de distribution gaz.',
        objectifs: 'Utiliser les équipements de détection, localiser les fuites, intervenir en sécurité.',
        prerequis: 'Connaissances de base en gaz',
        categorie: 'Réseau Gaz',
        tarif: 1200,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 14,
        dureeEnJours: 2,
        capaciteMax: 12,
      },
      {
        titre: 'Audit Interne ISO 9001/14001',
        description: 'Formation aux techniques d\'audit interne pour les systèmes de management de la qualité et de l\'environnement.',
        objectifs: 'Préparer et conduire un audit interne, rédiger le rapport d\'audit, proposer des actions correctives.',
        prerequis: 'Connaissance de base des normes ISO',
        categorie: 'QHSE / Normes',
        tarif: 1500,
        type: FormationType.CATALOGUE,
        dureeEnHeures: 14,
        dureeEnJours: 2,
        capaciteMax: 15,
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
      {
        titre: 'Leadership et Management d\'Équipe',
        description: 'Développer les compétences managériales pour encadrer et motiver les équipes.',
        objectifs: 'Adopter une posture de leader, animer des réunions efficaces, gérer les conflits.',
        prerequis: 'Aucun',
        categorie: 'Soft Skills',
        tarif: 1850,
        type: FormationType.INTER,
        dureeEnHeures: 21,
        dureeEnJours: 3,
        capaciteMax: 12,
      },
      {
        titre: 'Communication Professionnelle',
        description: 'Améliorer les compétences en communication écrite et orale en milieu professionnel.',
        objectifs: 'Structurer ses messages, communiquer efficacement en réunion, rédiger des rapports clairs.',
        prerequis: 'Aucun',
        categorie: 'Soft Skills',
        tarif: 1100,
        type: FormationType.INTER,
        dureeEnHeures: 14,
        dureeEnJours: 2,
        capaciteMax: 15,
      },
      {
        titre: 'Gestion du Stress et des Conflits',
        description: 'Techniques de gestion du stress et résolution de conflits en milieu professionnel.',
        objectifs: 'Identifier les sources de stress, adopter des techniques de relaxation, gérer les conflits.',
        prerequis: 'Aucun',
        categorie: 'Soft Skills',
        tarif: 950,
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

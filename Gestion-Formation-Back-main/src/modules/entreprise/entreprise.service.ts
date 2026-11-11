import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entreprise } from '../../entities/entreprise.entity';
import { CreateEntrepriseDto } from './dto/create-entreprise.dto';
import { UpdateEntrepriseDto } from './dto/update-entreprise.dto';

@Injectable()
export class EntrepriseService {
  constructor(
    @InjectRepository(Entreprise)
    private readonly entrepriseRepository: Repository<Entreprise>,
  ) {}

  async create(dto: CreateEntrepriseDto): Promise<Entreprise> {
    const entreprise = this.entrepriseRepository.create(dto);
    return this.entrepriseRepository.save(entreprise);
  }

  async findAll(): Promise<Entreprise[]> {
    return this.entrepriseRepository.find({ relations: { users: true } });
  }

  async findOne(id: string): Promise<Entreprise> {
    const entreprise = await this.entrepriseRepository.findOne({
      where: { id },
      relations: { users: true },
    });
    if (!entreprise) throw new NotFoundException(`Entreprise #${id} not found`);
    return entreprise;
  }

  async update(id: string, dto: UpdateEntrepriseDto): Promise<Entreprise> {
    const entreprise = await this.findOne(id);
    Object.assign(entreprise, dto);
    return this.entrepriseRepository.save(entreprise);
  }

  async remove(id: string): Promise<void> {
    const result = await this.entrepriseRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Entreprise #${id} not found`);
  }
}

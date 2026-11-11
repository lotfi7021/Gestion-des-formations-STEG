import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateEmployeDto } from '../employe/dto/create-employe.dto';
import { ManualJwtGuard } from '../auth/guards/manual-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('participants')
  findParticipants() {
    return this.userService.findAllParticipants();
  }

  @Post('participants')
  createParticipant(@Body() dto: CreateEmployeDto) {
    return this.userService.createParticipant(dto);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Get('cabinets')
  findCabinets() {
    return this.userService.findAllCabinets();
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Post('cabinets')
  createCabinet(@Body() dto: { nomCabinet: string; email: string; telephone?: string }) {
    return this.userService.createCabinet(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @UseGuards(ManualJwtGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

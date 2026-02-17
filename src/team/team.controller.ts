import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { TeamService } from './team.service';
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  AddTeamMemberSchema,
} from './dto/team.dto';
import type {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
} from './dto/team.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  @UsePipes(new ZodValidationPipe(CreateTeamSchema))
  create(@Body() body: CreateTeamDto) {
    return this.teamService.create(body);
  }

  @Get()
  findAll(@Query('page') page: number = 1, @Query('size') size: number = 10) {
    return this.teamService.findAll({ page: Number(page), size: Number(size) });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) body: UpdateTeamDto,
  ) {
    return this.teamService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  addMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddTeamMemberSchema)) body: AddTeamMemberDto,
  ) {
    return this.teamService.addMember(id, body.userId);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teamService.removeMember(id, userId);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTeamDto) {
    return this.prisma.team.create({
      data,
      include: { members: { include: { user: true } } },
    });
  }

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        members: { include: { user: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(id: string, data: UpdateTeamDto) {
    await this.findOne(id);
    return this.prisma.team.update({
      where: { id },
      data,
      include: { members: { include: { user: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.team.delete({ where: { id } });
  }

  async addMember(teamId: string, userId: string) {
    await this.findOne(teamId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw new ConflictException('User is already a team member');

    return this.prisma.teamMember.create({
      data: { teamId, userId },
      include: { user: true },
    });
  }

  async removeMember(teamId: string, userId: string) {
    await this.findOne(teamId);

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in team');

    return this.prisma.teamMember.delete({
      where: { id: member.id },
    });
  }
}

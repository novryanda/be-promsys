import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTaxDto, UpdateTaxDto } from './dto/tax.dto';

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTaxDto) {
    return this.prisma.tax.create({ data });
  }

  async findAll() {
    return this.prisma.tax.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const tax = await this.prisma.tax.findUnique({ where: { id } });
    if (!tax) throw new NotFoundException('Tax not found');
    return tax;
  }

  async update(id: string, data: UpdateTaxDto) {
    await this.findOne(id);
    return this.prisma.tax.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tax.delete({ where: { id } });
  }
}

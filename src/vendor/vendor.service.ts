import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateVendorDto) {
    return this.prisma.vendor.create({
      data,
      include: { category: true },
    });
  }

  async findAll() {
    return this.prisma.vendor.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(id: string, data: UpdateVendorDto) {
    await this.findOne(id);
    return this.prisma.vendor.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vendor.delete({ where: { id } });
  }
}

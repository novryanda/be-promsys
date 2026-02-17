import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);
  constructor(private prisma: PrismaService) { }

  private mapVendor(vendor: any) {
    return {
      ...vendor,
      googleMapsUrl:
        vendor.latitude && vendor.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${vendor.latitude},${vendor.longitude}`
          : null,
    };
  }

  async findAll(params: { page: number; size: number }) {
    const { page, size } = params;
    const skip = (page - 1) * size;

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        include: { category: true },
        orderBy: { name: 'asc' },
        skip,
        take: size,
      }),
      this.prisma.vendor.count(),
    ]);

    return {
      data: vendors.map((v) => this.mapVendor(v)),
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.mapVendor(vendor);
  }

  async create(data: CreateVendorDto) {
    const vendor = await this.prisma.vendor.create({
      data,
      include: { category: true },
    });
    return this.mapVendor(vendor);
  }

  async update(id: string, data: UpdateVendorDto) {
    await this.findOne(id);
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data,
      include: { category: true },
    });
    return this.mapVendor(vendor);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vendor.delete({ where: { id } });
  }
}

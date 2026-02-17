import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UsePipes,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { VendorService } from './vendor.service';
import {
  CreateVendorSchema,
  UpdateVendorSchema,
} from './dto/vendor.dto';
import type {
  CreateVendorDto,
  UpdateVendorDto,
} from './dto/vendor.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE)
  @UsePipes(new ZodValidationPipe(CreateVendorSchema))
  create(@Body() body: CreateVendorDto) {
    return this.vendorService.create(body);
  }

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE)
  findAll() {
    return this.vendorService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCE)
  findOne(@Param('id') id: string) {
    return this.vendorService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCE)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVendorSchema)) body: UpdateVendorDto,
  ) {
    return this.vendorService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.vendorService.remove(id);
  }
}

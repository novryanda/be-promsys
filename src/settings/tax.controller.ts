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
import { TaxService } from './tax.service';
import {
  CreateTaxSchema,
  UpdateTaxSchema,
} from './dto/tax.dto';
import type {
  CreateTaxDto,
  UpdateTaxDto,
} from './dto/tax.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateTaxSchema))
  create(@Body() body: CreateTaxDto) {
    return this.taxService.create(body);
  }

  @Get()
  findAll() {
    return this.taxService.findAll();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaxSchema)) body: UpdateTaxDto,
  ) {
    return this.taxService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.taxService.remove(id);
  }
}

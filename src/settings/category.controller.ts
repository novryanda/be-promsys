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
import { CategoryService } from './category.service';
import { CreateCategorySchema, UpdateCategorySchema } from './dto/category.dto';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateCategorySchema))
  create(@Body() body: CreateCategoryDto) {
    return this.categoryService.create(body);
  }

  @Get()
  findAll(@Query('type') type?: 'INCOME' | 'EXPENSE') {
    return this.categoryService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategorySchema)) body: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}

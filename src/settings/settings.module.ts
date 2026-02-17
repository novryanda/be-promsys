import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';

@Module({
  controllers: [CategoryController, TaxController],
  providers: [CategoryService, TaxService],
  exports: [CategoryService, TaxService],
})
export class SettingsModule {}

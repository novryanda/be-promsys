import { Module } from '@nestjs/common';
import { ReimbursementController } from './reimbursement.controller';
import { ReimbursementService } from './reimbursement.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [FileModule],
  controllers: [ReimbursementController],
  providers: [ReimbursementService],
  exports: [ReimbursementService],
})
export class ReimbursementModule {}

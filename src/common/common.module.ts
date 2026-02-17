import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { ValidationService } from './validation.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [PrismaService, ValidationService],
  exports: [PrismaService, ValidationService],
})
export class CommonModule {}

import {
  BadRequestException,
  PipeTransform,
  Injectable,
} from '@nestjs/common';
import { type ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private schema: ZodSchema;

  constructor(schema: ZodSchema) {
    this.schema = schema;
  }

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}

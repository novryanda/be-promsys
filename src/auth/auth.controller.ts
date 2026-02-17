import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { auth } from './auth.instance';
import { Public } from './public.decorator';

const betterAuthHandler = toNodeHandler(auth);

@Controller('api/auth')
export class AuthController {
  @Public()
  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    return betterAuthHandler(req, res);
  }
}

import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [RolesService, PrismaService],
})
export class RolesModule {}

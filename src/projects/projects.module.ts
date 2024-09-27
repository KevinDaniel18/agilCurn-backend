import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MailService } from 'src/mail.service';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const sanitizedFileName = file.originalname.replace(/[()]/g, '');
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(sanitizedFileName);
          cb(null, `${sanitizedFileName}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, MailService, PrismaService, UserService],
})
export class ProjectsModule {}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';
import { Strategy } from 'passport-local';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prismaService: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'clavesecreta',
    });
  }
  async validate(payload: { email: string }) {
    const userEmail = await this.prismaService.user.findUnique({
      where: {
        email: payload.email,
      },
    });
    return {
      id: userEmail.id,
      email: userEmail.email
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async initializeRoles() {
    const roles = [
      {
        roleName: 'Product Owner',
        description:
          'Responsible for maximizing product value and managing the product backlog, ensuring the team is working on the right tasks.',
      },
      {
        roleName: 'Scrum Master',
        description:
          'Facilitates Scrum ceremonies and helps remove impediments for the team, ensuring the team follows Scrum practices effectively.',
      },
      {
        roleName: 'Developer',
        description:
          'Team member responsible for designing, developing and testing the product, collaborating closely with other roles to deliver functional increments.',
      },
    ];

    for (const role of roles) {
      const existingRole = await this.prisma.role.findUnique({
        where: { roleName: role.roleName },
      });

      if (!existingRole) {
        await this.prisma.role.create({
          data: role,
        });
        console.log(`Role "${role.roleName}" created.`);
      } else {
        console.log(`Role "${role.roleName}" already exists.`);
      }
    }
  }
}

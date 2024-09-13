import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { User } from './user.model';
import { UserService } from './user.service';

@Controller('api/v1/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUser(): Promise<User[]> {
    return this.userService.getAllUser();
  }

  @Post()
  async postUser(@Body() postData: User): Promise<User> {
    return this.userService.createUser(postData);
  }

  @Get(':id')
  async getUser(@Param('id') id: number): Promise<User | null> {
    return this.userService.getUser(id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: number): Promise<User | null> {
    return this.userService.deleteUser(id);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() putData: User,
  ): Promise<User> {
    return this.userService.updateUser(id, putData);
  }

  @Put(':id/profile-image')
  async updateProfileImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.userService.updateUserProfileImage(Number(id), imageUrl);
  }

}

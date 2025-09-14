import { Body, Controller, Get, Param, Post, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { AssignRoleDto } from './dto/assign-role.dto';
import { Roles } from '../auth/roles.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiAcceptedResponse, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('apps/:appId/users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	// GET /v1/apps/:appId/users
		@Get()
		@ApiQuery({ name: 'q', required: false })
		@ApiQuery({ name: 'role', required: false })
		@ApiQuery({ name: 'page', required: false })
		@ApiQuery({ name: 'limit', required: false })
	@Roles('platform-admin', 'app-admin')
	@ApiOkResponse({ description: 'Paginated list of users with roles' })
	list(@Param('appId') appId: string, @Query() query: ListUsersQuery) {
		return this.usersService.listUsers(appId, query);
	}

	// POST /v1/apps/:appId/users
	@Post()
	@Roles('platform-admin', 'app-admin')
	@ApiCreatedResponse({ description: 'User created/added to app' })
	async create(@Param('appId') appId: string, @Body() dto: CreateUserDto, @Req() req: any) {
		const actorUserId = req.user?.sub; // assuming sub holds keycloak user id; mapped later
		return this.usersService.createUser(appId, dto, actorUserId);
	}

	// POST /v1/apps/:appId/users/:userId/roles
	@Post(':userId/roles')
	@Roles('platform-admin', 'app-admin')
	@ApiOkResponse({ description: 'Role assignment result' })
	assignRole(
		@Param('appId') appId: string,
		@Param('userId') userId: string,
		@Body() dto: AssignRoleDto,
		@Req() req: any,
	) {
		const actorUserId = req.user?.sub;
		return this.usersService.assignRole(appId, userId, dto, actorUserId);
	}

	// POST /v1/apps/:appId/users/:userId/reset-password
	@Post(':userId/reset-password')
	@Roles('platform-admin', 'app-admin')
	@HttpCode(HttpStatus.ACCEPTED)
	@ApiAcceptedResponse({ description: 'Password reset email triggered' })
	resetPassword(
		@Param('appId') appId: string,
		@Param('userId') userId: string,
		@Req() req: any,
	) {
		const actorUserId = req.user?.sub;
		return this.usersService.resetPassword(appId, userId, actorUserId);
	}
}

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	constructor() {}

	@Get()
	@ApiOkResponse({ description: 'Current authenticated user token info' })
	getMe(@Req() req: any) {
		// Return only selected token-derived fields
		const { sub, email, realm_access, resource_access } = req.user || {};
		return { sub, email, realm_access, resource_access };
	}
}

import { Controller, Get, Post, Body, Query, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse } from '@nestjs/swagger';
import { AppsService, PaginatedResult } from './apps.service.js';
import { CreateAppDto } from './dto/create-app.dto.js';
import { AppResponse } from './dto/app-response.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('apps')
@ApiBearerAuth()
@Controller('apps')
export class AppsController {
	constructor(private readonly appsService: AppsService) {}

	@Post()
	@ApiCreatedResponse({ description: 'Application created', type: Object })
	@Roles('platform-admin')
		create(@Body() dto: CreateAppDto): Promise<AppResponse> {
			return this.appsService.create(dto);
		}

	@Get()
	@ApiOkResponse({ description: 'List applications' })
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiQuery({ name: 'q', required: false })
	@Roles('platform-admin')
	findAll(
		@Query('page') page = '1',
		@Query('limit') limit = '20',
		@Query('q') q?: string,
		): Promise<PaginatedResult<AppResponse>> {
			return this.appsService.findAll(parseInt(page, 10) || 1, parseInt(limit, 10) || 20, q);
		}

	@Get(':id')
	@ApiOkResponse({ description: 'Get application by id' })
	@Roles('platform-admin')
		findOne(@Param('id') id: string): Promise<AppResponse> {
			return this.appsService.findOne(id);
		}

	@Delete(':id')
	@ApiNoContentResponse({ description: 'Application deleted' })
	@Roles('platform-admin')
		remove(@Param('id') id: string): Promise<void> {
			return this.appsService.remove(id);
		}
}

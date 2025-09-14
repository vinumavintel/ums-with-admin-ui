import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { register, collectDefaultMetrics } from 'prom-client';

// Initialize default metrics once
let metricsInitialized = false;
function ensureMetrics() {
	if (!metricsInitialized) {
		collectDefaultMetrics({ prefix: 'ums_' });
		metricsInitialized = true;
	}
}

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
	@Get()
	@ApiOkResponse({ description: 'Prometheus metrics in text format' })
	@Header('Content-Type', 'text/plain; version=0.0.4')
	async getMetrics(): Promise<string> {
		ensureMetrics();
		return await register.metrics();
	}
}

import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Post('activity')
  async createActivity(
    @Req() request: FastifyRequest,
    @Body()
    payload: {
      id: string;
      timestamp: string;
      category: string;
      action: string;
      description: string;
      user?: string;
    },
  ) {
    const user = (request as any)?.user;
    await this.dashboardService.createActivity({
      ...payload,
      user: user?.name || user?.sub || payload.user || 'Unknown',
      line_uid: user?.sub ?? null,
    });
    return { ok: true };
  }
}

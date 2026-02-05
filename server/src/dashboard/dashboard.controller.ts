import { Body, Controller, Get, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Post('activity')
  async createActivity(
    @Body()
    payload: {
      id: string;
      timestamp: string;
      category: string;
      action: string;
      description: string;
      user: string;
    },
  ) {
    await this.dashboardService.createActivity(payload);
    return { ok: true };
  }
}

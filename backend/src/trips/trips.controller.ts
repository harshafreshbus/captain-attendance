import { Controller, Get, Query } from '@nestjs/common';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('live-assignments')
  async getLiveAssignments(
    @Query('userTypeId') userTypeId: string,
    @Query('userId') userId?: string,
    @Query('depotId') depotId?: string,
  ) {
    if (!userTypeId) {
      return { success: false, message: 'userTypeId query parameter is required' };
    }
    
    const parsedUserTypeId = parseInt(userTypeId, 10);
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;
    const parsedDepotId = depotId ? parseInt(depotId, 10) : undefined;

    const data = await this.tripsService.getLiveAssignments(parsedUserTypeId, parsedUserId, parsedDepotId);
    
    // Prisma returns BigInt values for BigInt columns. BigInt cannot be serialized by standard JSON.stringify
    // The typical workaround in NestJS is converting BigInt to string in a mapping or interceptor.
    const serializedData = data.map((row: any) => {
      const newRow = { ...row };
      for (const key in newRow) {
        if (typeof newRow[key] === 'bigint') {
          newRow[key] = newRow[key].toString();
        }
      }
      return newRow;
    });

    return serializedData;
  }

  @Get('depot-captains-roster')
  async getDepotCaptainsRoster(@Query('userId') userId: string) {
    if (!userId) return { success: false, message: 'userId is required' };
    const data = await this.tripsService.getDepotCaptainsOverall(parseInt(userId, 10));
    return this.serializeBigInt(data);
  }

  @Get('captain-history')
  async getCaptainHistory(@Query('captainId') captainId: string) {
    if (!captainId) return { success: false, message: 'captainId is required' };
    const data = await this.tripsService.getCaptainHistory(parseInt(captainId, 10));
    return this.serializeBigInt(data);
  }

  @Get('unassigned-captains-yesterday')
  async getUnassignedCaptainsYesterday(@Query('userId') userId: string) {
    if (!userId) return { success: false, message: 'userId is required' };
    const data = await this.tripsService.getUnassignedCaptainsYesterday(parseInt(userId, 10));
    return data;
  }

  @Get('ops-dashboard-metrics')
  async getOpsDashboardMetrics() {
    const data = await this.tripsService.getOpsDashboardMetrics();
    return data;
  }

  @Get('ops-captains-list')
  async getAllCaptainsForOps(@Query('depotId') depotId?: string) {
    const parsedDepotId = depotId ? parseInt(depotId, 10) : undefined;
    const data = await this.tripsService.getAllCaptainsForOps(parsedDepotId);
    return this.serializeBigInt(data);
  }

  @Get('week-assignments')
  async getWeekAssignments(@Query('userId') userId: string, @Query('startDate') startDate?: string) {
    if (!userId) return { success: false, message: 'userId is required' };
    const data = await this.tripsService.getWeekAssignments(parseInt(userId, 10), startDate);
    return data;
  }

  private serializeBigInt(data: any[]) {
    return data.map((row: any) => {
      const newRow = { ...row };
      for (const key in newRow) {
        if (typeof newRow[key] === 'bigint') {
          newRow[key] = newRow[key].toString();
        }
      }
      return newRow;
    });
  }
}

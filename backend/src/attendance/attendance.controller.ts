import { Controller, Post, Body } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('punch')
  async recordPunch(@Body() body: { captainId: number; tripId: string; status: string }) {
    try {
      const result = await this.attendanceService.recordPunch(
        body.captainId,
        body.tripId,
        body.status
      );
      return {
        success: true,
        message: 'Punch recorded successfully',
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record punch',
      };
    }
  }
}

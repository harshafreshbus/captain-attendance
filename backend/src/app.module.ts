import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [AuthModule, TripsModule, AttendanceModule],
})
export class AppModule {}

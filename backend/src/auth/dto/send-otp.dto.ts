import { IsMobilePhone, IsNotEmpty, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  mobile!: string;

  @IsOptional()
  deviceId?: string;
}

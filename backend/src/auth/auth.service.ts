import { Injectable } from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';

const prisma = new PrismaClient();

function genOtpCode() {
  return ('' + (100000 + randomInt(900000))).slice(0, 6);
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async sendOtp(dto: { mobile: string; deviceId?: string }) {
    const deviceId = dto.deviceId || 'default-device';
    const code = genOtpCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 7); // 7 minutes

    await prisma.oTP.create({
      data: {
        mobile: dto.mobile,
        deviceId,
        code,
        expiresAt,
      },
    });

    // TODO: integrate real SMS provider. For now return debug info.
    return { status: true, message: 'OTP sent', debug: { code } };
  }

  async resendOtp(dto: { mobile: string }) {
    // naive resend: call sendOtp
    return this.sendOtp({ mobile: dto.mobile });
  }

  async verifyOtp(dto: { mobile: string; otp: string; deviceId: string }, res: Response) {
    const record = await prisma.oTP.findFirst({
      where: { mobile: dto.mobile, deviceId: dto.deviceId, code: dto.otp, used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return { status: false, message: 'Invalid OTP' };
    if (record.expiresAt < new Date()) return { status: false, message: 'OTP expired' };

    // mark used
    await prisma.oTP.update({ where: { id: record.id }, data: { used: true } });

    // find or create user
    let user: any = null;
    if (record.userId) {
      user = await prisma.user.findUnique({ where: { id: record.userId } });
    }
    if (!user) {
      // create or find by mobile
      user = await prisma.user.upsert({
        where: { mobile: dto.mobile },
        create: { mobile: dto.mobile, userTypeId: 4 }, // Default to Captain
        update: {},
      });
    }

    // create refresh token
    const refreshToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' });
    const accessToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_ACCESS_SECRET || 'access-secret', expiresIn: '15m' });

    const hashed = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({ data: { tokenHash: hashed, userId: user.id, deviceId: dto.deviceId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    const secure = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return { status: true, user: { id: user.id, userTypeId: user.userTypeId, userName: user.userName, firstName: user.firstName, active: user.active } };
  }

  async login(dto: { email: string; password: string; deviceId: string }, res: Response) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) return { status: false, message: 'Invalid credentials' };
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) return { status: false, message: 'Invalid credentials' };

    const refreshToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' });
    const accessToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_ACCESS_SECRET || 'access-secret', expiresIn: '15m' });
    const hashed = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({ data: { tokenHash: hashed, userId: user.id, deviceId: dto.deviceId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    const secure = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return { status: true, user: { id: user.id, userTypeId: user.userTypeId, userName: user.userName, firstName: user.firstName, active: user.active } };
  }

  async refreshToken(req: Request, res: Response) {
    const token = req.cookies?.['refresh_token'];
    if (!token) return { status: false };
    try {
      const payload: any = this.jwtService.verify(token, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
      const userId = payload.sub as string;

      // check token exists in DB
      const tokens = await prisma.refreshToken.findMany({ where: { userId } });
      // naive: accept if any token exists (stronger check would compare hashed)
      if (!tokens || tokens.length === 0) return { status: false };

      const accessToken = this.jwtService.sign({ sub: userId }, { secret: process.env.JWT_ACCESS_SECRET || 'access-secret', expiresIn: '15m' });
      res.cookie('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
      return { status: true };
    } catch (e) {
      return { status: false };
    }
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.['refresh_token'];
    if (token) {
      try {
        const payload: any = this.jwtService.verify(token, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
        const userId = payload.sub as string;
        await prisma.refreshToken.deleteMany({ where: { userId } });
      } catch (e) {}
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}

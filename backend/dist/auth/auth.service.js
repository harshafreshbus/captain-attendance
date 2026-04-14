"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const jwt_1 = require("@nestjs/jwt");
const prisma = new client_1.PrismaClient();
function genOtpCode() {
    return ('' + (100000 + (0, crypto_1.randomInt)(900000))).slice(0, 6);
}
let AuthService = class AuthService {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async sendOtp(dto) {
        const deviceId = dto.deviceId || 'default-device';
        const code = genOtpCode();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 7);
        await prisma.oTP.create({
            data: {
                mobile: dto.mobile,
                deviceId,
                code,
                expiresAt,
            },
        });
        return { status: true, message: 'OTP sent', debug: { code } };
    }
    async resendOtp(dto) {
        return this.sendOtp({ mobile: dto.mobile });
    }
    async verifyOtp(dto, res) {
        const record = await prisma.oTP.findFirst({
            where: { mobile: dto.mobile, deviceId: dto.deviceId, code: dto.otp, used: false },
            orderBy: { createdAt: 'desc' },
        });
        if (!record)
            return { status: false, message: 'Invalid OTP' };
        if (record.expiresAt < new Date())
            return { status: false, message: 'OTP expired' };
        await prisma.oTP.update({ where: { id: record.id }, data: { used: true } });
        let user = null;
        if (record.userId) {
            user = await prisma.user.findUnique({ where: { id: record.userId } });
        }
        if (!user) {
            user = await prisma.user.upsert({
                where: { mobile: dto.mobile },
                create: { mobile: dto.mobile, userTypeId: 4 },
                update: {},
            });
        }
        const refreshToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' });
        const accessToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_ACCESS_SECRET || 'access-secret', expiresIn: '15m' });
        const hashed = await bcrypt.hash(refreshToken, 10);
        await prisma.refreshToken.create({ data: { tokenHash: hashed, userId: user.id, deviceId: dto.deviceId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        const secure = process.env.NODE_ENV === 'production';
        res.cookie('access_token', accessToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return { status: true, user: { id: user.id, userTypeId: user.userTypeId, userName: user.userName, firstName: user.firstName, active: user.active } };
    }
    async login(dto, res) {
        const user = await prisma.user.findUnique({ where: { email: dto.email } });
        if (!user || !user.password)
            return { status: false, message: 'Invalid credentials' };
        const ok = await bcrypt.compare(dto.password, user.password);
        if (!ok)
            return { status: false, message: 'Invalid credentials' };
        const refreshToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' });
        const accessToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_ACCESS_SECRET || 'access-secret', expiresIn: '15m' });
        const hashed = await bcrypt.hash(refreshToken, 10);
        await prisma.refreshToken.create({ data: { tokenHash: hashed, userId: user.id, deviceId: dto.deviceId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        const secure = process.env.NODE_ENV === 'production';
        res.cookie('access_token', accessToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        return { status: true, user: { id: user.id, userTypeId: user.userTypeId, userName: user.userName, firstName: user.firstName, active: user.active } };
    }
    async refreshToken(req, res) {
        const token = req.cookies?.['refresh_token'];
        if (!token)
            return { status: false };
        try {
            const payload = this.jwtService.verify(token, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
            const userId = payload.sub;
            const tokens = await prisma.refreshToken.findMany({ where: { userId } });
            if (!tokens || tokens.length === 0)
                return { status: false };
            const accessToken = this.jwtService.sign({ sub: userId }, { secret: process.env.JWT_ACCESS_SECRET || 'access-secret', expiresIn: '15m' });
            res.cookie('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
            return { status: true };
        }
        catch (e) {
            return { status: false };
        }
    }
    async logout(req, res) {
        const token = req.cookies?.['refresh_token'];
        if (token) {
            try {
                const payload = this.jwtService.verify(token, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
                const userId = payload.sub;
                await prisma.refreshToken.deleteMany({ where: { userId } });
            }
            catch (e) { }
        }
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AuthService);

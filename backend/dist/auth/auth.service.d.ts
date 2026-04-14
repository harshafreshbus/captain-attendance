import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private jwtService;
    constructor(jwtService: JwtService);
    sendOtp(dto: {
        mobile: string;
        deviceId?: string;
    }): Promise<{
        status: boolean;
        message: string;
        debug: {
            code: string;
        };
    }>;
    resendOtp(dto: {
        mobile: string;
    }): Promise<{
        status: boolean;
        message: string;
        debug: {
            code: string;
        };
    }>;
    verifyOtp(dto: {
        mobile: string;
        otp: string;
        deviceId: string;
    }, res: Response): Promise<{
        status: boolean;
        message: string;
        user?: undefined;
    } | {
        status: boolean;
        user: {
            id: any;
            userTypeId: any;
            userName: any;
            firstName: any;
            active: any;
        };
        message?: undefined;
    }>;
    login(dto: {
        email: string;
        password: string;
        deviceId: string;
    }, res: Response): Promise<{
        status: boolean;
        message: string;
        user?: undefined;
    } | {
        status: boolean;
        user: {
            id: number;
            userTypeId: number;
            userName: any;
            firstName: string | null;
            active: boolean;
        };
        message?: undefined;
    }>;
    refreshToken(req: Request, res: Response): Promise<{
        status: boolean;
    }>;
    logout(req: Request, res: Response): Promise<void>;
}

import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    sendOtp(dto: SendOtpDto): Promise<{
        status: boolean;
        message: string;
        debug: {
            code: string;
        };
    }>;
    verifyOtp(dto: VerifyOtpDto, res: Response): Promise<Response<any, Record<string, any>>>;
    resendOtp(dto: SendOtpDto): Promise<{
        status: boolean;
        message: string;
        debug: {
            code: string;
        };
    }>;
    login(dto: LoginDto, res: Response): Promise<Response<any, Record<string, any>>>;
    refresh(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}

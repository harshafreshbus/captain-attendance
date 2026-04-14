import { TripsService } from './trips.service';
export declare class TripsController {
    private readonly tripsService;
    constructor(tripsService: TripsService);
    getLiveAssignments(userTypeId: string, userId?: string, depotId?: string): Promise<any[] | {
        success: boolean;
        message: string;
    }>;
    getDepotCaptainsRoster(userId: string): Promise<any[] | {
        success: boolean;
        message: string;
    }>;
    getCaptainHistory(captainId: string): Promise<any[] | {
        success: boolean;
        message: string;
    }>;
    getUnassignedCaptainsYesterday(userId: string): Promise<never[] | {
        totalCaptains: number;
        assignedYesterday: number;
        unassignedYesterday: number;
        unassignedCaptains: {
            id: any;
            name: any;
        }[];
    } | {
        success: boolean;
        message: string;
    }>;
    getOpsDashboardMetrics(): Promise<{
        globalMetrics: {
            totalCaptains: number;
            present: number;
            absent: number;
            late: number;
        };
        depotPerformance: {
            name: any;
            stationId: any;
            present: number;
            absent: number;
            late: number;
            total: number;
        }[];
        trendData: {
            date: any;
            rate: number;
        }[];
    }>;
    getAllCaptainsForOps(depotId?: string): Promise<any[]>;
    private serializeBigInt;
}

import { PrismaService } from '../prisma.service';
export declare class TripsService {
    private prisma;
    constructor(prisma: PrismaService);
    getLiveAssignments(userTypeId: number, userId?: number, depotId?: number): Promise<any[]>;
    private getCaptainTrips;
    private getDepotTrips;
    private getOperationsTrips;
    getDepotCaptainsOverall(userId: number): Promise<any[]>;
    getCaptainHistory(captainId: number): Promise<any[]>;
    getUnassignedCaptainsYesterday(userId: number): Promise<never[] | {
        totalCaptains: number;
        assignedYesterday: number;
        unassignedYesterday: number;
        unassignedCaptains: {
            id: any;
            name: any;
        }[];
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
    getAllCaptainsForOps(depotId?: number): Promise<any[]>;
}

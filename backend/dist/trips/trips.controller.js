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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const trips_service_1 = require("./trips.service");
let TripsController = class TripsController {
    constructor(tripsService) {
        this.tripsService = tripsService;
    }
    async getLiveAssignments(userTypeId, userId, depotId) {
        if (!userTypeId) {
            return { success: false, message: 'userTypeId query parameter is required' };
        }
        const parsedUserTypeId = parseInt(userTypeId, 10);
        const parsedUserId = userId ? parseInt(userId, 10) : undefined;
        const parsedDepotId = depotId ? parseInt(depotId, 10) : undefined;
        const data = await this.tripsService.getLiveAssignments(parsedUserTypeId, parsedUserId, parsedDepotId);
        const serializedData = data.map((row) => {
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
    async getDepotCaptainsRoster(userId) {
        if (!userId)
            return { success: false, message: 'userId is required' };
        const data = await this.tripsService.getDepotCaptainsOverall(parseInt(userId, 10));
        return this.serializeBigInt(data);
    }
    async getCaptainHistory(captainId) {
        if (!captainId)
            return { success: false, message: 'captainId is required' };
        const data = await this.tripsService.getCaptainHistory(parseInt(captainId, 10));
        return this.serializeBigInt(data);
    }
    async getUnassignedCaptainsYesterday(userId) {
        if (!userId)
            return { success: false, message: 'userId is required' };
        const data = await this.tripsService.getUnassignedCaptainsYesterday(parseInt(userId, 10));
        return data;
    }
    async getOpsDashboardMetrics() {
        const data = await this.tripsService.getOpsDashboardMetrics();
        return data;
    }
    async getAllCaptainsForOps(depotId) {
        const parsedDepotId = depotId ? parseInt(depotId, 10) : undefined;
        const data = await this.tripsService.getAllCaptainsForOps(parsedDepotId);
        return this.serializeBigInt(data);
    }
    serializeBigInt(data) {
        return data.map((row) => {
            const newRow = { ...row };
            for (const key in newRow) {
                if (typeof newRow[key] === 'bigint') {
                    newRow[key] = newRow[key].toString();
                }
            }
            return newRow;
        });
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, common_1.Get)('live-assignments'),
    __param(0, (0, common_1.Query)('userTypeId')),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('depotId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getLiveAssignments", null);
__decorate([
    (0, common_1.Get)('depot-captains-roster'),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getDepotCaptainsRoster", null);
__decorate([
    (0, common_1.Get)('captain-history'),
    __param(0, (0, common_1.Query)('captainId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getCaptainHistory", null);
__decorate([
    (0, common_1.Get)('unassigned-captains-yesterday'),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getUnassignedCaptainsYesterday", null);
__decorate([
    (0, common_1.Get)('ops-dashboard-metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getOpsDashboardMetrics", null);
__decorate([
    (0, common_1.Get)('ops-captains-list'),
    __param(0, (0, common_1.Query)('depotId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getAllCaptainsForOps", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)('trips'),
    __metadata("design:paramtypes", [trips_service_1.TripsService])
], TripsController);

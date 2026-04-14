import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) { }

  async getLiveAssignments(userTypeId: number, userId?: number, depotId?: number) {
    if (userTypeId === 4 && userId) {
      return await this.getCaptainTrips(userId);
    } else if ((userTypeId === 3) && userId) {
      return await this.getDepotTrips(userId);
    } else if (userTypeId === 10) {
      return await this.getOperationsTrips();
    }

    return [];
  }

  // 1. CAPTAIN QUERY (Lightning Fast, Target isolation)
  private async getCaptainTrips(userId: number) {
    const rawSql = `
      WITH target_trips AS (
        -- Step 1: Instantly find the exact 1-2 Trip IDs this captain is assigned to today
        -- Using LIKE to hit text search without doing a full table scan or casting
        SELECT DISTINCT "tripId" 
        FROM "public"."TripQuestions"
        WHERE "answer" LIKE '%${userId}-%'
      ),
      trip_data AS (
        SELECT
          s."serviceNumber",
          t."id" AS "tripId",
          t."journeyDate",
          MAX(CASE WHEN q."name" = 'Vehicle Number' THEN tq."answer" END) AS "vehicleNumber",
          MAX(CASE WHEN q."name" = 'Captain' THEN tq."answer" END) AS "captainRaw",
          MAX(CASE WHEN q."name" = 'Co-Captain' THEN tq."answer" END) AS "coCaptainRaw"
        FROM "public"."TripQuestions" tq
        -- Step 2: STRICT INNER JOIN ensures we only evaluate the 1-2 target trips!
        INNER JOIN target_trips tt ON tq."tripId" = tt."tripId"
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
        WHERE q."name" IN ('Vehicle Number', 'Captain', 'Co-Captain')
        GROUP BY s."serviceNumber", t."id", t."journeyDate"
      )
      SELECT
        td."tripId",
        td."serviceNumber",
        td."journeyDate",
        td."vehicleNumber"
        -- We explicitly drop all other heavy columns! The Captain UI only needs these 4!
      FROM trip_data td;
    `;
    const result = await this.prisma.$queryRawUnsafe<any[]>(rawSql);
    return result;
  }

  // 2. DEPOT MANAGER QUERY (Medium fast)
  private async getDepotTrips(userId: number) {
    // 1. Fetch the station(s) this manager is mapped to
    const stations = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT "A" FROM "public"."_StationsToUser" WHERE "B" = ${userId}
      `);

    if (!stations || stations.length === 0) {
      return []; // Manager not mapped to any station
    }

    const stationIds = stations.map(s => s.A).join(',');

    // 2. Query trips and filter by those same stations via the Captain's direct depotStationId
    // We check both Captain and Co-Captain fields
    const rawSql = `
      WITH trip_data AS (
        SELECT
          s."serviceNumber",
          s."name" AS "serviceName",
          st_src."name" AS "sourceStation",
          st_dest."name" AS "destinationStation",
          t."id" AS "tripId",
          t."journeyDate",
          t."startedAt",
          t."endedAt",
          MAX(CASE WHEN q."name" = 'Vehicle Number' THEN tq."answer" END) AS "vehicleNumber",
          MAX(CASE WHEN q."name" = 'Captain' THEN tq."answer" END) AS "captainRaw",
          MAX(CASE WHEN q."name" = 'Co-Captain' THEN tq."answer" END) AS "coCaptainRaw"
        FROM "public"."TripQuestions" tq
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
        LEFT JOIN "public"."Stations" st_src ON s."sourceId" = st_src."id"
        LEFT JOIN "public"."Stations" st_dest ON s."destinationId" = st_dest."id"
        WHERE q."name" IN ('Vehicle Number', 'Captain', 'Co-Captain')
          AND t."journeyDate" = CURRENT_DATE
        GROUP BY s."serviceNumber", s."name", st_src."name", st_dest."name", t."id", t."journeyDate", t."startedAt", t."endedAt"
      ),
      captains_with_stations AS (
        SELECT 
          td.*,
          NULLIF(SPLIT_PART(td."captainRaw", '-', 1), '')::INTEGER AS "captainId",
          SPLIT_PART(td."captainRaw", '-', 2) AS "captainName",
          NULLIF(SPLIT_PART(td."coCaptainRaw", '-', 1), '')::INTEGER AS "coCaptainId",
          SPLIT_PART(td."coCaptainRaw", '-', 2) AS "coCaptainName",
          u1."depotStationId" AS "captainStationId",
          u2."depotStationId" AS "coCaptainStationId"
        FROM trip_data td
        LEFT JOIN "public"."User" u1 ON u1."id" = NULLIF(SPLIT_PART(td."captainRaw", '-', 1), '')::INTEGER
        LEFT JOIN "public"."User" u2 ON u2."id" = NULLIF(SPLIT_PART(td."coCaptainRaw", '-', 1), '')::INTEGER
      )
      SELECT 
        *
      FROM captains_with_stations
      WHERE "captainStationId" IN (${stationIds}) 
         OR "coCaptainStationId" IN (${stationIds});
    `;
    const result = await this.prisma.$queryRawUnsafe<any[]>(rawSql);
    return result;
  }

  // 3. OPERATIONS MANAGER QUERY (Heavy sweep, mapped DTOs)
  private async getOperationsTrips() {
    // Sweeps the entire dataset but minimizes payload significantly
    const rawSql = `
      WITH trip_data AS (
        SELECT
          s."serviceNumber",
          t."id" AS "tripId",
          t."journeyDate",
          MAX(CASE WHEN q."name" = 'Vehicle Number' THEN tq."answer" END) AS "vehicleNumber",
          MAX(CASE WHEN q."name" = 'Captain' THEN tq."answer" END) AS "captainRaw",
          MAX(CASE WHEN q."name" = 'Co-Captain' THEN tq."answer" END) AS "coCaptainRaw"
        FROM "public"."TripQuestions" tq
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
        WHERE q."name" IN ('Vehicle Number', 'Captain', 'Co-Captain')
        GROUP BY s."serviceNumber", t."id", t."journeyDate"
      )
      SELECT
        td."tripId",
        td."serviceNumber",
        td."journeyDate",
        SPLIT_PART(td."captainRaw", '-', 2) AS "captainName",
        SPLIT_PART(td."coCaptainRaw", '-', 2) AS "coCaptainName"
      FROM trip_data td;
    `;
    const result = await this.prisma.$queryRawUnsafe<any[]>(rawSql);
    return result;
  }

  // 4. DEPOT ROSTER (Overall aggregate stats)
  async getDepotCaptainsOverall(userId: number) {
    const stations = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT "A" FROM "public"."_StationsToUser" WHERE "B" = ${userId}
    `);
    if (!stations || stations.length === 0) return [];
    const stationIds = stations.map(s => s.A).join(',');

    const rawSql = `
      -- 1. Get all active captains belonging to this depot
      WITH depot_captains AS (
        SELECT "id" AS "captainId", "firstName" AS "captainName"
        FROM "public"."User"
        WHERE "depotStationId" IN (${stationIds}) AND "active" = true AND "userTypeId" = 4
      ),
      -- 2. Get today's trips and their details
      trips_today AS (
        SELECT 
           t."id" AS "tripId",
           s."serviceNumber",
           t."startedAt",
           MAX(CASE WHEN q."name" = 'Vehicle Number' THEN tq."answer" END) AS "vehicleNumber"
        FROM "public"."Trips" t
        JOIN "public"."Services" s ON t."serviceId" = s."id"
        LEFT JOIN "public"."TripQuestions" tq ON t."id" = tq."tripId"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        WHERE t."journeyDate" = CURRENT_DATE
        GROUP BY t."id", s."serviceNumber", t."startedAt"
      ),
      -- 3. Get captain assignments for those trips
      assignments AS (
        SELECT
          tt."tripId",
          tt."serviceNumber",
          tt."vehicleNumber",
          tt."startedAt",
          NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER AS "assignedId"
        FROM trips_today tt
        JOIN "public"."TripQuestions" tq ON tt."tripId" = tq."tripId"
        JOIN "public"."Questions" q ON tq."questionId" = q."id"
        WHERE q."name" IN ('Captain', 'Co-Captain')
      )
      -- 4. Join everything
      SELECT 
        dc."captainId",
        dc."captainName",
        COUNT(DISTINCT a."tripId") as "totalTrips",
        COUNT(DISTINCT CASE WHEN a."startedAt" IS NOT NULL THEN a."tripId" END) as "tripsStarted",
        STRING_AGG(DISTINCT a."serviceNumber", ', ') as "serviceNumbers",
        STRING_AGG(DISTINCT a."vehicleNumber", ', ') as "vehicleNumbers"
      FROM depot_captains dc
      LEFT JOIN assignments a ON dc."captainId" = a."assignedId"
      GROUP BY dc."captainId", dc."captainName"
      ORDER BY dc."captainName" ASC;
    `;
    return await this.prisma.$queryRawUnsafe<any[]>(rawSql);
  }

  // 5. CAPTAIN HISTORY (Full trip list for a profile)
  async getCaptainHistory(captainId: number) {
    const rawSql = `
      SELECT
        t."id" AS "tripId",
        t."journeyDate",
        t."startedAt",
        t."endedAt",
        s."serviceNumber",
        s."name" AS "serviceName",
        st_src."name" AS "sourceStation",
        st_dest."name" AS "destinationStation",
        MAX(CASE WHEN q."name" = 'Vehicle Number' THEN tq_v."answer" END) AS "vehicleNumber"
      FROM "public"."TripQuestions" tq
      LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
      LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
      LEFT JOIN "public"."Stations" st_src ON s."sourceId" = st_src."id"
      LEFT JOIN "public"."Stations" st_dest ON s."destinationId" = st_dest."id"
      -- Self join or look up trip questions for this trip's vehicle number
      LEFT JOIN "public"."TripQuestions" tq_v ON tq_v."tripId" = t."id"
      LEFT JOIN "public"."Questions" q ON tq_v."questionId" = q."id" AND q."name" = 'Vehicle Number'
      WHERE tq."answer" LIKE '${captainId}-%'
      GROUP BY t."id", t."journeyDate", t."startedAt", t."endedAt", s."serviceNumber", s."name", st_src."name", st_dest."name"
      ORDER BY t."journeyDate" DESC;
    `;
    return await this.prisma.$queryRawUnsafe<any[]>(rawSql);
  }

  // 6. UNASSIGNED CAPTAINS FROM YESTERDAY
  async getUnassignedCaptainsYesterday(userId: number) {
    // 1. Fetch the station(s) this manager is mapped to
    const stations = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT "A" FROM "public"."_StationsToUser" WHERE "B" = ${userId}
    `);

    if (!stations || stations.length === 0) {
      return [];
    }

    const stationIds = stations.map(s => s.A).join(',');

    // 2. Get all active captains for this depot
    const allCaptainsRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT "id", CONCAT("firstName", ' ', COALESCE("lastName", '')) AS name
      FROM "public"."User"
      WHERE "depotStationId" IN (${stationIds}) AND "active" = true AND "userTypeId" = 4
      ORDER BY "firstName" ASC
    `);

    // 3. Get captains assigned yesterday
    const assignedYesterdayRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH yesterday_trips AS (
        SELECT DISTINCT
          NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER AS "captainId"
        FROM "public"."TripQuestions" tq
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        LEFT JOIN "public"."User" u ON u."id" = NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER
        WHERE q."name" IN ('Captain', 'Co-Captain')
          AND t."journeyDate" = CURRENT_DATE - INTERVAL '1 day'
          AND u."depotStationId" IN (${stationIds})
          AND u."id" IS NOT NULL
      )
      SELECT "captainId" FROM yesterday_trips
    `);

    const assignedIds = new Set(assignedYesterdayRaw.map((r: any) => r.captainId));
    const unassigned = allCaptainsRaw.filter((c: any) => !assignedIds.has(c.id));

    return {
      totalCaptains: allCaptainsRaw.length,
      assignedYesterday: assignedYesterdayRaw.length,
      unassignedYesterday: unassigned.length,
      unassignedCaptains: unassigned.map((c: any) => ({
        id: c.id,
        name: c.name.trim(),
      })),
    };
  }

  // 7. OPS DASHBOARD METRICS (Global executive view with all depots and station names)
  async getOpsDashboardMetrics() {
    // Get global metrics
    const globalMetricsRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH today_trips AS (
        SELECT DISTINCT
          NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER AS "captainId"
        FROM "public"."TripQuestions" tq
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        WHERE q."name" IN ('Captain', 'Co-Captain')
          AND t."journeyDate" = CURRENT_DATE
      ),
      started_trips AS (
        SELECT DISTINCT
          NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER AS "captainId"
        FROM "public"."TripQuestions" tq
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        WHERE q."name" IN ('Captain', 'Co-Captain')
          AND t."journeyDate" = CURRENT_DATE
          AND t."startedAt" IS NOT NULL
      )
      SELECT
        (SELECT COUNT(DISTINCT "id") FROM "public"."User" WHERE "userTypeId" = 4 AND "active" = true) AS "totalCaptains",
        COALESCE((SELECT COUNT(*) FROM started_trips), 0) AS "present",
        COALESCE((SELECT COUNT(*) FROM today_trips), 0) - COALESCE((SELECT COUNT(*) FROM started_trips), 0) AS "absent",
        COALESCE((SELECT COUNT(DISTINCT t."id") 
          FROM "public"."Trips" t
          LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
          WHERE t."journeyDate" = CURRENT_DATE 
            AND t."startedAt" > COALESCE(s."scheduledStartTime", t."startedAt")
        ), 0) AS "late"
    `);

    // Get depot performance with station names
    const depotPerformanceRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH depot_data AS (
        SELECT 
          st."id" AS "stationId",
          st."name" AS "stationName",
          COUNT(DISTINCT u."id") AS "totalCaptains",
          COALESCE(COUNT(DISTINCT CASE WHEN st2."id" IS NOT NULL THEN u."id" END), 0) AS "presentCount"
        FROM "public"."Stations" st
        LEFT JOIN "public"."User" u ON u."depotStationId" = st."id" AND u."userTypeId" = 4 AND u."active" = true
        LEFT JOIN "public"."TripQuestions" tq ON tq."answer" LIKE CONCAT(u."id", '-%')
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id" AND t."journeyDate" = CURRENT_DATE AND t."startedAt" IS NOT NULL
        LEFT JOIN "public"."Stations" st2 ON st2."id" = st."id"
        GROUP BY st."id", st."name"
        ORDER BY st."name"
      )
      SELECT 
        "stationName" AS "name",
        "stationId" AS "stationId",
        "totalCaptains",
        "presentCount",
        CASE 
          WHEN "totalCaptains" > 0 THEN ROUND(("presentCount" * 100.0 / "totalCaptains")::numeric, 2)
          ELSE 0 
        END AS "present",
        ("totalCaptains" - "presentCount") AS "absent",
        COALESCE(
          (SELECT COUNT(DISTINCT t."id") 
           FROM "public"."Trips" t
           LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
           LEFT JOIN "public"."TripQuestions" tq ON t."id" = tq."tripId"
           LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
           LEFT JOIN "public"."User" u ON u."id" = NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER
           WHERE t."journeyDate" = CURRENT_DATE 
             AND q."name" IN ('Captain', 'Co-Captain')
             AND u."depotStationId" = depot_data."stationId"
             AND t."startedAt" > COALESCE(s."scheduledStartTime", t."startedAt")),
          0
        ) AS "late"
      FROM depot_data
    `);

    // Get 7-day trend data
    const trendDataRaw = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH date_range AS (
        SELECT CURRENT_DATE - INTERVAL '6 days' + (n * INTERVAL '1 day') AS "date"
        FROM generate_series(0, 6) AS n
      ),
      daily_metrics AS (
        SELECT 
          dr."date",
          COUNT(DISTINCT CASE WHEN t."startedAt" IS NOT NULL THEN u."id" END) AS "present",
          COUNT(DISTINCT u."id") AS "total"
        FROM date_range dr
        LEFT JOIN "public"."Trips" t ON t."journeyDate" = dr."date"
        LEFT JOIN "public"."TripQuestions" tq ON t."id" = tq."tripId"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id" AND q."name" IN ('Captain', 'Co-Captain')
        LEFT JOIN "public"."User" u ON u."id" = NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER AND u."userTypeId" = 4
        GROUP BY dr."date"
      )
      SELECT 
        TO_CHAR("date", 'DD Mon') AS "date",
        CASE 
          WHEN "total" > 0 THEN ROUND(("present" * 100.0 / "total")::numeric, 2)
          ELSE 0
        END AS "rate"
      FROM daily_metrics
      ORDER BY "date"
    `);

    const globalMetrics = globalMetricsRaw[0] || { 
      totalCaptains: 0, 
      present: 0, 
      absent: 0, 
      late: 0 
    };

    return {
      globalMetrics: {
        totalCaptains: parseInt(globalMetrics.totalCaptains?.toString() || '0'),
        present: parseInt(globalMetrics.present?.toString() || '0'),
        absent: parseInt(globalMetrics.absent?.toString() || '0'),
        late: parseInt(globalMetrics.late?.toString() || '0'),
      },
      depotPerformance: depotPerformanceRaw.map((depot: any) => ({
        name: depot.name,
        stationId: depot.stationId,
        present: parseFloat(depot.present?.toString() || '0'),
        absent: parseInt(depot.absent?.toString() || '0'),
        late: parseInt(depot.late?.toString() || '0'),
        total: parseInt(depot.totalCaptains?.toString() || '0'),
      })),
      trendData: trendDataRaw.map((trend: any) => ({
        date: trend.date,
        rate: parseFloat(trend.rate?.toString() || '0'),
      })),
    };
  }

  // 8. OPS CAPTAINS LIST (All captains across all depots with assignments for ops dashboard)
  async getAllCaptainsForOps(depotId?: number) {
    let stationFilter = '';
    if (depotId) {
      stationFilter = `AND st."id" = ${depotId}`;
    }

    const rawSql = `
      WITH captains_data AS (
        SELECT 
          u."id" AS "captainId",
          CONCAT(u."firstName", ' ', COALESCE(u."lastName", '')) AS "captainName",
          st."id" AS "depotStationId",
          st."name" AS "depotName",
          u."mobile" AS "mobile"
        FROM "public"."User" u
        LEFT JOIN "public"."Stations" st ON u."depotStationId" = st."id"
        WHERE u."userTypeId" = 4 AND u."active" = true
        ${stationFilter}
      ),
      today_assignments AS (
        SELECT 
          NULLIF(SPLIT_PART(tq."answer", '-', 1), '')::INTEGER AS "captainId",
          t."id" AS "tripId",
          t."startedAt",
          s."serviceNumber",
          v."answer" AS "vehicleNumber"
        FROM "public"."TripQuestions" tq
        LEFT JOIN "public"."Trips" t ON tq."tripId" = t."id"
        LEFT JOIN "public"."Questions" q ON tq."questionId" = q."id"
        LEFT JOIN "public"."Services" s ON t."serviceId" = s."id"
        LEFT JOIN "public"."TripQuestions" v ON v."tripId" = t."id" 
          AND v."questionId" = (SELECT "id" FROM "public"."Questions" WHERE "name" = 'Vehicle Number')
        WHERE q."name" IN ('Captain', 'Co-Captain')
          AND t."journeyDate" = CURRENT_DATE
      )
      SELECT 
        cd."captainId",
        cd."captainName",
        cd."depotStationId",
        cd."depotName",
        cd."mobile",
        COUNT(DISTINCT ta."tripId") AS "totalAssigned",
        COALESCE(COUNT(DISTINCT CASE WHEN ta."startedAt" IS NOT NULL THEN ta."tripId" END), 0) AS "tripsStarted",
        STRING_AGG(DISTINCT ta."serviceNumber", ', ') AS "services",
        STRING_AGG(DISTINCT ta."vehicleNumber", ', ') AS "vehicles",
        CASE 
          WHEN COUNT(DISTINCT ta."tripId") > 0 AND COUNT(DISTINCT CASE WHEN ta."startedAt" IS NOT NULL THEN ta."tripId" END) > 0 
          THEN 'Present'
          WHEN COUNT(DISTINCT ta."tripId") > 0 AND COUNT(DISTINCT CASE WHEN ta."startedAt" IS NOT NULL THEN ta."tripId" END) = 0
          THEN 'Absent'
          ELSE 'Unassigned'
        END AS "status"
      FROM captains_data cd
      LEFT JOIN today_assignments ta ON cd."captainId" = ta."captainId"
      GROUP BY cd."captainId", cd."captainName", cd."depotStationId", cd."depotName", cd."mobile"
      ORDER BY cd."depotName", cd."captainName" ASC;
    `;
    
    const result = await this.prisma.$queryRawUnsafe<any[]>(rawSql);
    return result;
  }
}

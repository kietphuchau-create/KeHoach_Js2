package com.medsched.statistics;

import com.medsched.security.AppUserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    /**
     * Endpoint Thống kê chung theo vai trò (Admin, Doctor, Staff).
     */
    @GetMapping("/statistics/overview")
    public StatisticsDtos.StatisticsOverviewResponse getOverview(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "DAY") String granularity,
            @RequestParam(defaultValue = "LAST_30_DAYS") String range,
            @RequestParam(required = false) String metricId,
            @AuthenticationPrincipal AppUserDetails principal) {

        String userId = (principal != null) ? principal.getUserId() : null;
        return statisticsService.getOverview(role, granularity, range, metricId, userId);
    }

    /**
     * Alias endpoint riêng trong phân hệ Admin (/api/v1/admin/statistics/overview)
     */
    @GetMapping("/admin/statistics/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public StatisticsDtos.StatisticsOverviewResponse getAdminOverview(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "DAY") String granularity,
            @RequestParam(defaultValue = "LAST_30_DAYS") String range,
            @RequestParam(required = false) String metricId,
            @AuthenticationPrincipal AppUserDetails principal) {

        String userId = (principal != null) ? principal.getUserId() : null;
        return statisticsService.getOverview("ROLE_ADMIN", granularity, range, metricId, userId);
    }
}

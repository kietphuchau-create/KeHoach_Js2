package com.medsched.statistics;

import java.math.BigDecimal;
import java.util.List;

public class StatisticsDtos {

    public record TimeSeriesPoint(
            String label,
            String timestamp,
            long value,
            String formattedValue
    ) {}

    public record MetricCardData(
            String id,
            String label,
            String value,
            String unit,
            Double changePercent,
            boolean isPositiveGood,
            List<Double> sparklineData,
            String tooltip
    ) {}

    public record DonutSegment(
            String label,
            long value,
            double percentage,
            String color
    ) {}

    public record BreakdownItem(
            String id,
            int rank,
            String title,
            String subtitle,
            String primaryMetric,
            String secondaryMetric,
            String badge,
            String badgeColor
    ) {}

    public record AvailableMetric(
            String id,
            String label,
            String unit
    ) {}

    public record BreakdownHeader(
            String rank,
            String name,
            String primary,
            String secondary
    ) {}

    public record StatisticsOverviewResponse(
            String roleScope,
            String dateRangeLabel,
            long totalSessionsOrVisits,
            String timeGranularity,
            List<AvailableMetric> availableMetrics,
            String selectedMetricId,
            List<TimeSeriesPoint> timeSeries,
            List<MetricCardData> kpiCards,
            String donutTitle,
            List<DonutSegment> donutSegments,
            String breakdownTitle,
            BreakdownHeader breakdownHeaders,
            List<BreakdownItem> breakdownItems
    ) {}
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildMockInsight } from "../utils/mockInsights.ts";
import type { MarketInsight, ModelMode } from "../types.ts";

interface UseMarketInsightsArgs {
  asset: string;
  timeframe: string;
  modelMode: ModelMode;
}

interface UseMarketInsightsResult {
  insight?: MarketInsight;
  isLoading: boolean;
  error?: Error;
  refresh: () => void;
  lastUpdated?: string;
}

export function useMarketInsights({
  asset,
  timeframe,
  modelMode
}: UseMarketInsightsArgs): UseMarketInsightsResult {
  const [insight, setInsight] = useState<MarketInsight>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [lastUpdated, setLastUpdated] = useState<string>();

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      // TODO: Replace mock builder with real API integration once backend is ready
      await new Promise((resolve) => setTimeout(resolve, 600));
      const data = buildMockInsight(asset, timeframe, modelMode);
      setInsight(data);
      setLastUpdated(data.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [asset, timeframe, modelMode]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const resultInsight = useMemo(() => insight, [insight]);

  return {
    insight: resultInsight,
    isLoading,
    error,
    refresh: fetchInsights,
    lastUpdated
  };
}
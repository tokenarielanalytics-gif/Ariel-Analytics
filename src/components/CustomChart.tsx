import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { 
  createChart, 
  ColorType, 
  CandlestickData, 
  Time, 
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  MouseEventParams
} from "lightweight-charts";

interface CustomChartProps {
  symbol: string;
  chainId?: string;
  pairAddress?: string;
}

interface TooltipData {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  visible: boolean;
}

/**
 * Real Data Fetching from Backend API
 * Connects to Binance via our proxy for real historical data
 */
const fetchData = async (symbol: string, chainId?: string, pairAddress?: string): Promise<any[]> => {
  try {
    const url = chainId && pairAddress 
      ? `/api/crypto/history?chainId=${chainId}&pairAddress=${pairAddress}`
      : `/api/crypto/history?symbol=${symbol}`;
    
    const response = await axios.get(url);
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch real history", error);
    return [];
  }
};

/**
 * Professional SMA Calculation
 * Uses exactly N periods including current candle
 */
const calculateSMA = (data: CandlestickData<Time>[], period: number) => {
  const smaData = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    
    smaData.push({
      time: data[i].time,
      value: sum / period,
    });
  }
  return smaData;
};

export default function CustomChart({ symbol, chainId, pairAddress }: CustomChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Refs to store chart and series instances to avoid recreation
  const chartApiRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [tooltip, setTooltip] = useState<TooltipData>({
    time: "", open: "", high: "", low: "", close: "", volume: "", visible: false
  });

  // 1. Initialize Chart (Once)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: "#1e293b", style: LineStyle.Dotted },
        horzLines: { color: "#1e293b", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#22d3ee",
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: "#0f172a",
        },
        horzLine: {
          color: "#22d3ee",
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: "#0f172a",
        },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartApiRef.current = chart;

    // Create Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#22d3ee",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeriesRef.current = volumeSeries;

    // Configure Volume Price Scale (Must be done AFTER series with this ID is added)
    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: false, // Keep it as an overlay (no axis visible)
    });

    const smaSeries = chart.addSeries(LineSeries, {
      color: "#22d3ee",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "SMA (20)",
    });
    smaSeriesRef.current = smaSeries;

    // Handle Tooltip / Crosshair Move
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setTooltip(prev => ({ ...prev, visible: false }));
      } else {
        const data = param.seriesData.get(candlestickSeries) as CandlestickData<Time>;
        const volData = param.seriesData.get(volumeSeries) as { value: number };
        
        if (data) {
          setTooltip({
            visible: true,
            time: new Date((data.time as number) * 1000).toLocaleDateString(),
            open: data.open.toFixed(2),
            high: data.high.toFixed(2),
            low: data.low.toFixed(2),
            close: data.close.toFixed(2),
            volume: volData ? (volData.value / 1000).toFixed(1) + "K" : "0",
          });
        }
      }
    });

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartApiRef.current) {
        chartApiRef.current.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartApiRef.current = null;
    };
  }, []);

  // 2. Update Data (When symbol or pool changes)
  useEffect(() => {
    const updateChartData = async () => {
      if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !smaSeriesRef.current) return;

      const rawData = await fetchData(symbol, chainId, pairAddress);
      
      // Check if the chart is still active after the async call
      if (!chartApiRef.current || !candlestickSeriesRef.current || !volumeSeriesRef.current || !smaSeriesRef.current) return;

      if (!Array.isArray(rawData)) {
        console.error("rawData is not an array", rawData);
        return;
      }
      
      const ohlcData = rawData.map((d: any) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      // Update Series
      candlestickSeriesRef.current.setData(ohlcData);

      const volumeData = rawData.map((d: any) => ({
        time: d.time as Time,
        value: d.volume,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }));
      volumeSeriesRef.current.setData(volumeData);

      const smaData = calculateSMA(ohlcData, 20);
      smaSeriesRef.current.setData(smaData);

      // Fit content on symbol change
      chartApiRef.current?.timeScale().fitContent();
    };

    updateChartData();
  }, [symbol, chainId, pairAddress]);

  return (
    <div className="relative w-full h-full group bg-[#020617] rounded-xl overflow-hidden border border-white/5">
      {/* Tooltip / Info Bar */}
      <div className={`absolute top-4 left-4 z-20 transition-opacity duration-200 ${tooltip.visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shadow-2xl">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase">Time</span>
            <span className="text-white">{tooltip.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase">O</span>
            <span className="text-white">{tooltip.open}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase">H</span>
            <span className="text-green-400">{tooltip.high}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase">L</span>
            <span className="text-red-400">{tooltip.low}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 uppercase">C</span>
            <span className="text-white font-bold">{tooltip.close}</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
            <span className="text-gray-500 uppercase">Vol</span>
            <span className="text-cyan-400">{tooltip.volume}</span>
          </div>
        </div>
      </div>

      {/* Symbol Label (Static) */}
      <div className="absolute bottom-6 left-6 z-10 pointer-events-none opacity-20">
        <div className="flex flex-col">
          <span className="text-4xl font-black text-white tracking-tighter">{symbol.toUpperCase()}</span>
          <span className="text-xs font-bold text-cyan-400">ARIEL ANALYTICS</span>
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
        style={{ minHeight: "450px" }}
      />
    </div>
  );
}

import * as echarts from "echarts"
import { FC, useEffect, useMemo, useRef } from "react"

interface DataPoint {
  category: number
  [key: string]:
    | {
        value: string
        timestamp: number
        status: string
      }
    | number
}

interface ILineChart {
  data: DataPoint[]
  height?: number
}

export const LineChart: FC<ILineChart> = ({ data, height = 400 }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  // Transform data for the chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null

    const metricsMap: Map<
      string,
      Array<{
        timestamp: number
        value: number
        status: string
      }>
    > = new Map()

    data.forEach((item) => {
      const { category, ...metrics } = item

      Object.entries(metrics).forEach(([metricName, metricData]) => {
        if (typeof metricData === "object" && metricData !== null) {
          if (!metricsMap.has(metricName)) {
            metricsMap.set(metricName, [])
          }
          metricsMap.get(metricName)!.push({
            timestamp: metricData.timestamp,
            value: parseFloat(metricData.value),
            status: metricData.status,
          })
        }
      })
    })

    // Sort each metric's data by timestamp
    metricsMap.forEach((values) => {
      values.sort((a, b) => a.timestamp - b.timestamp)
    })

    return metricsMap
  }, [data])

  useEffect(() => {
    if (!chartRef.current || !chartData) return

    // Initialize chart instance
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current)
    }

    const chart = chartInstanceRef.current

    // Get all unique timestamps
    const allTimestamps = new Set<number>()
    chartData.forEach((values) => {
      values.forEach((item) => allTimestamps.add(item.timestamp))
    })
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

    // Create series for each metric
    const series: any[] = []
    const metricNames = Array.from(chartData.keys())

    metricNames.forEach((metricName) => {
      const metricData = chartData.get(metricName)!
      const dataMap = new Map(metricData.map((item) => [item.timestamp, item]))

      series.push({
        name: metricName,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: sortedTimestamps.map((timestamp) => {
          const dataPoint = dataMap.get(timestamp)
          return dataPoint ? dataPoint.value : null
        }),
        itemStyle: {
          color: (params: any) => {
            const dataPoint = metricData[params.dataIndex]
            if (!dataPoint) return "#1890ff"

            const statusColors: Record<string, string> = {
              GOOD: "#52c41a",
              WARNING: "#faad14",
              ERROR: "#f5222d",
            }
            return statusColors[dataPoint.status] || "#1890ff"
          },
        },
        lineStyle: {
          width: 2,
        },
      })
    })

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return ""

          const timestamp = sortedTimestamps[params[0].dataIndex]
          const date = new Date(timestamp)
          const dateStr = date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })

          let result = `${dateStr}<br/>`

          params.forEach((param: any) => {
            const metricData = chartData.get(param.seriesName)!
            const dataPoint = metricData.find((item) => item.timestamp === timestamp)

            if (dataPoint) {
              result += `${param.marker} ${param.seriesName}: ${dataPoint.value} (${dataPoint.status})<br/>`
            }
          })

          return result
        },
      },
      legend: {
        data: metricNames,
        top: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "40px",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: sortedTimestamps.map((timestamp) => {
          const date = new Date(timestamp)
          return date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        }),
        axisLabel: {
          rotate: 45,
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: "{value}",
        },
      },
      series,
    }

    chart.setOption(option)

    // Handle resize
    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [chartData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [])

  if (!chartData || chartData.size === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: `${height}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
        }}
      >
        No data available
      </div>
    )
  }

  return <div ref={chartRef} style={{ width: "100%", height: `${height}px` }} />
}

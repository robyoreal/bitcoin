import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getHistoricalPrices } from '../services/api';
import './PriceGraph.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PriceGraph = ({ cryptos, initialCoinId = 'bitcoin' }) => {
  const [selectedCrypto, setSelectedCrypto] = useState(initialCoinId);
  const [timeRange, setTimeRange] = useState(7); // Default to 7 days
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Time range options
  const timeRanges = [
    { label: '24H', value: 1 },
    { label: '7D', value: 7 },
    { label: '30D', value: 30 }
  ];

  // Fetch historical prices
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getHistoricalPrices(selectedCrypto, timeRange);
        const historicalData = response.data.data;

        if (!historicalData || historicalData.length === 0) {
          throw new Error('No data available');
        }

        // Format data for Chart.js
        const labels = historicalData.map(item => {
          const date = new Date(item.timestamp);
          if (timeRange === 1) {
            // For 24h, show hours
            return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });
          } else if (timeRange === 7) {
            // For 7d, show day and time
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit'
            });
          } else {
            // For 30d, show date
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
          }
        });

        const prices = historicalData.map(item => item.price);

        // Calculate price change
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        const isPositive = priceChange >= 0;

        // Set chart color based on price trend
        const lineColor = isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        const gradientColor = isPositive
          ? 'rgba(34, 197, 94, 0.1)'
          : 'rgba(239, 68, 68, 0.1)';

        setChartData({
          labels,
          datasets: [
            {
              label: `Price (USD)`,
              data: prices,
              borderColor: lineColor,
              backgroundColor: gradientColor,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: lineColor,
              pointHoverBorderColor: '#fff',
              pointHoverBorderWidth: 2
            }
          ],
          priceChange,
          currentPrice: lastPrice
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching historical data:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load chart data');
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [selectedCrypto, timeRange]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => {
            return context[0].label;
          },
          label: (context) => {
            const price = context.parsed.y;
            return `Price: $${price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 8,
          font: {
            size: 11
          }
        }
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          callback: (value) => {
            return '$' + value.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            });
          },
          font: {
            size: 11
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Get current crypto info
  const currentCrypto = cryptos?.find(c => c.id === selectedCrypto);

  return (
    <div className="price-graph-container">
      <div className="price-graph-header">
        <div className="price-graph-left">
          <select
            className="crypto-selector"
            value={selectedCrypto}
            onChange={(e) => setSelectedCrypto(e.target.value)}
          >
            {cryptos && cryptos.map(crypto => (
              <option key={crypto.id} value={crypto.id}>
                {crypto.symbol} - {crypto.name}
              </option>
            ))}
          </select>

          {chartData && currentCrypto && (
            <div className="price-info">
              <div className="current-price">
                ${chartData.currentPrice?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <div className={`price-change ${chartData.priceChange >= 0 ? 'positive' : 'negative'}`}>
                {chartData.priceChange >= 0 ? '+' : ''}{chartData.priceChange.toFixed(2)}%
                <span className="change-label"> ({timeRanges.find(t => t.value === timeRange)?.label})</span>
              </div>
            </div>
          )}
        </div>

        <div className="time-range-selector">
          {timeRanges.map(range => (
            <button
              key={range.value}
              className={`time-range-btn ${timeRange === range.value ? 'active' : ''}`}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrapper">
        {loading && (
          <div className="chart-loading">
            <div className="spinner"></div>
            <p>Loading chart data...</p>
          </div>
        )}

        {error && (
          <div className="chart-error">
            <p>⚠️ {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!loading && !error && chartData && (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

export default PriceGraph;

/**
 * COSMIC ODYSSEY — DATA PULSE TELEMETRY ENGINE
 * In-browser interactive data playground supporting Excel (.xlsx, .xls) and CSV parsing,
 * real-time Chart.js visual analytics, cosmic KPIs, and instant chart export.
 */

(function () {
  'use strict';

  let activeDataset = [];
  let chartInstance = null;

  // DOM Elements
  const fileInput = document.getElementById('telemetry-file-input');
  const fileNameDisplay = document.getElementById('telemetry-file-name');
  const loadSampleBtn = document.getElementById('load-cosmic-sample-btn');
  const xAxisSelect = document.getElementById('param-x-axis');
  const yAxisSelect = document.getElementById('param-y-axis');
  const aggSelect = document.getElementById('param-agg');
  const chartTypeSelect = document.getElementById('param-chart-type');
  const exportBtn = document.getElementById('export-chart-png-btn');
  const chartCanvas = document.getElementById('telemetry-chart-canvas');
  const kpiTotalEl = document.getElementById('kpi-total-val');
  const kpiAvgEl = document.getElementById('kpi-avg-val');
  const kpiMaxEl = document.getElementById('kpi-max-val');
  const kpiCountEl = document.getElementById('kpi-count-val');
  const tableHead = document.getElementById('telemetry-thead');
  const tableBody = document.getElementById('telemetry-tbody');

  if (!chartCanvas) return;

  // Cosmic Data Pools for Realistic Sample Generation
  const cosmicDimensionPool = [
    { name: "Sector", values: ["Orion Spur", "Sagittarius Arm", "Perseus Arm", "Centaurus Core", "Cygnus Loop"] },
    { name: "Mission Type", values: ["Deep Space Probe", "Planetary Survey", "Orbital Telemetry", "Comet Intercept", "Exoplanet Transit"] },
    { name: "Payload Class", values: ["Spectrometer", "Radio Interferometer", "Gravitational Sensor", "Laser Altimeter", "Ion Detector"] },
    { name: "Station Dept", values: ["Astro-Analytics", "Propulsion Dynamics", "Exobiology", "Telemetry Ops", "Quantum Comms"] },
    { name: "Space Agency", values: ["ISRO", "NASA", "ESA", "JAXA", "Cosmic Research Group"] }
  ];

  const cosmicMetricPool = [
    { name: "Signal Strength (dBm)", min: 45, max: 280, decimals: 1 },
    { name: "Telemetry Packets", min: 1200, max: 48000, decimals: 0 },
    { name: "Solar Flux (kW)", min: 15, max: 92, decimals: 2 },
    { name: "Processing Speed (TFLOPS)", min: 140, max: 1850, decimals: 0 },
    { name: "Fuel Reserve (%)", min: 18, max: 99, decimals: 1 },
    { name: "Anomaly Events", min: 0, max: 35, decimals: 0 }
  ];

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function generateCosmicSampleData() {
    const chosenDims = shuffle(cosmicDimensionPool).slice(0, 2);
    const chosenMetrics = shuffle(cosmicMetricPool).slice(0, 3);
    const rowCount = 45 + Math.floor(Math.random() * 55);

    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const row = {};
      chosenDims.forEach(dim => {
        row[dim.name] = dim.values[Math.floor(Math.random() * dim.values.length)];
      });
      chosenMetrics.forEach(met => {
        const val = met.min + Math.random() * (met.max - met.min);
        row[met.name] = met.decimals > 0 ? parseFloat(val.toFixed(met.decimals)) : Math.round(val);
      });
      rows.push(row);
    }
    return rows;
  }

  // Populate Field Selectors
  function setupColumnSelectors(data) {
    if (!data || data.length === 0) return;
    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    const textCols = [];
    const numCols = [];

    columns.forEach(col => {
      const hasNumber = data.some(r => typeof r[col] === 'number' && !isNaN(r[col]));
      if (hasNumber) {
        numCols.push(col);
      } else {
        textCols.push(col);
      }
    });

    const xOptions = textCols.length > 0 ? textCols : columns;
    const yOptions = numCols.length > 0 ? numCols : columns;

    xAxisSelect.innerHTML = xOptions.map(c => `<option value="${c}">${c}</option>`).join('');
    yAxisSelect.innerHTML = yOptions.map(c => `<option value="${c}">${c}</option>`).join('');

    renderTelemetryDashboard();
  }

  // Aggregate Data based on selected parameters
  function aggregateTelemetry(data, xKey, yKey, aggType) {
    const groups = {};

    data.forEach(row => {
      const rawX = row[xKey];
      const xVal = rawX !== undefined && rawX !== null && rawX !== '' ? String(rawX) : '(Unassigned)';
      const rawY = parseFloat(row[yKey]);
      const yVal = isNaN(rawY) ? 0 : rawY;

      if (!groups[xVal]) {
        groups[xVal] = { values: [], count: 0 };
      }
      groups[xVal].values.push(yVal);
      groups[xVal].count++;
    });

    const labels = Object.keys(groups);
    const aggregatedValues = labels.map(label => {
      const vals = groups[label].values;
      if (vals.length === 0) return 0;
      switch (aggType) {
        case 'SUM':
          return vals.reduce((a, b) => a + b, 0);
        case 'AVG':
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        case 'MAX':
          return Math.max(...vals);
        case 'MIN':
          return Math.min(...vals);
        case 'COUNT':
          return groups[label].count;
        default:
          return vals.reduce((a, b) => a + b, 0);
      }
    });

    return { labels, values: aggregatedValues };
  }

  // Render Chart.js
  function renderChart(labels, values, chartType, metricName) {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = chartCanvas.getContext('2d');

    // Create Cosmic Gradients
    const cyanGrad = ctx.createLinearGradient(0, 0, 0, 360);
    cyanGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    cyanGrad.addColorStop(1, 'rgba(2, 132, 199, 0.25)');

    const cosmicPalette = [
      '#38bdf8', '#818cf8', '#a855f7', '#fbbf24', '#34d399',
      '#f43f5e', '#60a5fa', '#c084fc', '#fde047', '#4ade80'
    ];

    const isPieOrDoughnut = ['pie', 'doughnut'].includes(chartType);

    chartInstance = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: metricName,
          data: values,
          backgroundColor: isPieOrDoughnut ? cosmicPalette.slice(0, labels.length) : cyanGrad,
          borderColor: isPieOrDoughnut ? 'rgba(3, 7, 18, 0.8)' : '#38bdf8',
          borderWidth: isPieOrDoughnut ? 2 : 2,
          borderRadius: chartType === 'bar' ? 6 : 0,
          fill: chartType === 'line',
          tension: 0.35,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#38bdf8',
          pointRadius: 4,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isPieOrDoughnut,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(6, 11, 24, 0.95)',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderWidth: 1,
            titleColor: '#38bdf8',
            bodyColor: '#ffffff',
            titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13 },
            padding: 12,
            cornerRadius: 8,
            boxPadding: 6
          }
        },
        scales: isPieOrDoughnut ? {} : {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: "'JetBrains Mono', monospace", size: 11 }
            }
          }
        }
      }
    });
  }

  // Update Live KPIs
  function updateKPIs(values, count) {
    if (!values || values.length === 0) return;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);

    const fmt = n => n > 99999 ? n.toExponential(2) : n.toLocaleString(undefined, { maximumFractionDigits: 1 });

    if (kpiTotalEl) kpiTotalEl.textContent = fmt(sum);
    if (kpiAvgEl) kpiAvgEl.textContent = fmt(avg);
    if (kpiMaxEl) kpiMaxEl.textContent = fmt(max);
    if (kpiCountEl) kpiCountEl.textContent = count.toLocaleString();
  }

  // Render Telemetry Table
  function renderTablePreview(data) {
    if (!tableHead || !tableBody || !data || data.length === 0) return;
    const cols = Object.keys(data[0]);

    tableHead.innerHTML = cols.map(c => `<th>${c}</th>`).join('');
    const previewRows = data.slice(0, 8);
    tableBody.innerHTML = previewRows.map(row => {
      return `<tr>${cols.map(c => `<td>${row[c] !== undefined ? row[c] : ''}</td>`).join('')}</tr>`;
    }).join('');
  }

  // Master Dashboard Refresh
  function renderTelemetryDashboard() {
    if (!activeDataset || activeDataset.length === 0) return;
    const xKey = xAxisSelect.value;
    const yKey = yAxisSelect.value;
    const agg = aggSelect.value;
    const chartType = chartTypeSelect.value;

    const { labels, values } = aggregateTelemetry(activeDataset, xKey, yKey, agg);
    renderChart(labels, values, chartType, `${agg} of ${yKey}`);
    updateKPIs(values, activeDataset.length);
    renderTablePreview(activeDataset);
  }

  // Event Listeners for Controls
  [xAxisSelect, yAxisSelect, aggSelect, chartTypeSelect].forEach(select => {
    if (select) {
      select.addEventListener('change', renderTelemetryDashboard);
    }
  });

  // Load Cosmic Sample Data
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      activeDataset = generateCosmicSampleData();
      if (fileNameDisplay) fileNameDisplay.textContent = 'cosmic_sample_telemetry.csv';
      setupColumnSelectors(activeDataset);
      if (window.showToast) window.showToast('✓ Cosmic Telemetry Data Loaded');
    });
  }

  // Parse Excel / CSV Files via SheetJS
  function handleUploadedFile(file) {
    if (!file) return;
    if (fileNameDisplay) fileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          alert('Uploaded dataset appears to be empty.');
          return;
        }

        activeDataset = json;
        setupColumnSelectors(activeDataset);
        if (window.showToast) window.showToast(`✓ Loaded ${json.length} records from ${file.name}`);
      } catch (err) {
        console.error('File parsing error', err);
        alert('Could not parse file. Please upload a valid CSV or Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleUploadedFile(e.target.files[0]);
      }
    });
  }

  // Export Chart as PNG
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!chartInstance) return;
      const imageURI = chartCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `samyak_cosmic_telemetry_${Date.now()}.png`;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (window.showToast) window.showToast('✓ Chart exported as PNG');
    });
  }

  // Auto-load sample dataset on launch
  activeDataset = generateCosmicSampleData();
  setupColumnSelectors(activeDataset);

})();

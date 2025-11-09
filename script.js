let dailyChartInstance = null;
let dailyChartData = null;

// Helper function to get current week number and day index
function getCurrentWeekAndDay() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate week number (assuming week starts on Monday)
    // Get Monday of current week
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    monday.setDate(diff);
    
    // Set to start of week (Monday, 00:00:00)
    monday.setHours(0, 0, 0, 0);
    
    // Get a reference date (you may need to adjust this based on when week 1 started)
    // For now, we'll calculate week number based on a known start date
    // Assuming week 1 started on a specific Monday - you may need to adjust this
    const referenceDate = new Date('2024-01-01'); // Adjust this to your actual week 1 start date
    const referenceMonday = new Date(referenceDate);
    const refDay = referenceMonday.getDay();
    const refDiff = referenceMonday.getDate() - refDay + (refDay === 0 ? -6 : 1);
    referenceMonday.setDate(refDiff);
    referenceMonday.setHours(0, 0, 0, 0);
    
    // Calculate week number (weeks since reference Monday + 1)
    const weeksDiff = Math.floor((monday - referenceMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    // Convert day of week: Sunday=0 -> 6, Monday=1 -> 0, Tuesday=2 -> 1, etc.
    // So Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    return { weekNumber: weeksDiff, dayIndex: dayIndex };
}

// Helper function to check if a week is the current week and get data cutoff
function getDataCutoffIndex(weekNumber, isLatestWeek) {
    // If this is the latest week (current week), only show data up to today
    if (isLatestWeek) {
        const { dayIndex: currentDayIndex } = getCurrentWeekAndDay();
        return currentDayIndex; // inclusive, so 0-based index means include day 0
    }
    
    // For past weeks, return 6 (include all days)
    return 6;
}

// Fetch and render combined chart
async function loadCombinedChart() {
    try {
        const response = await fetch('data/combined-chart-data.json');
        const data = await response.json();
        
        const ctx = document.getElementById('combined-chart').getContext('2d');
        
        // Prepare datasets
        const datasets = [];
        
        // Gym task scores line
        if (data.gymTaskScores && data.gymTaskScores.length > 0) {
            datasets.push({
                label: 'Gym Task Score',
                data: data.gymTaskScores,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 5,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2,
                tension: 0.4,
                type: 'line',
                fill: false
            });
        }
        
        // Business task scores line
        if (data.businessTaskScores && data.businessTaskScores.length > 0) {
            datasets.push({
                label: 'Business Task Score',
                data: data.businessTaskScores,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                pointRadius: 5,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2,
                pointStyle: 'rect',
                tension: 0.4,
                type: 'line',
                fill: false
            });
        }
        
        // Gym measure bars
        if (data.gymMeasures && data.gymMeasures.length > 0) {
            const gymBarData = new Array(data.weeks.length).fill(null);
            data.gymMeasures.forEach(measure => {
                const weekIndex = data.weeks.indexOf(measure.week);
                if (weekIndex >= 0) {
                    gymBarData[weekIndex] = measure.score;
                }
            });
            
            datasets.push({
                label: 'Gym Measure Score',
                data: gymBarData,
                backgroundColor: gymBarData.map(score => {
                    if (!score) return 'transparent';
                    if (score >= 100) return '#3b82f6';
                    if (score >= 80) return '#60a5fa';
                    if (score >= 50) return '#93c5fd';
                    return '#dbeafe';
                }),
                borderColor: '#3b82f6',
                borderWidth: 0,
                type: 'bar',
                order: 0,
                barThickness: 28,
                categoryPercentage: 0.7,
                barPercentage: 0.6
            });
        }
        
        // Business measure bars
        if (data.businessMeasures && data.businessMeasures.length > 0) {
            const businessBarData = new Array(data.weeks.length).fill(null);
            data.businessMeasures.forEach(measure => {
                const weekIndex = data.weeks.indexOf(measure.week);
                if (weekIndex >= 0) {
                    businessBarData[weekIndex] = measure.score;
                }
            });
            
            datasets.push({
                label: 'Business Measure Score',
                data: businessBarData,
                backgroundColor: businessBarData.map(score => {
                    if (!score) return 'transparent';
                    if (score >= 100) return '#ef4444';
                    if (score >= 80) return '#f87171';
                    if (score >= 50) return '#fca5a5';
                    return '#fee2e2';
                }),
                borderColor: '#ef4444',
                borderWidth: 0,
                type: 'bar',
                order: 0,
                barThickness: 28,
                categoryPercentage: 0.7,
                barPercentage: 0.6
            });
        }
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.weeks,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            padding: 10,
                            usePointStyle: true,
                            color: '#a3a3a3',
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1f1f1f',
                        borderColor: '#404040',
                        borderWidth: 1,
                        padding: 12,
                        titleColor: '#ffffff',
                        bodyColor: '#a3a3a3',
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += Math.round(context.parsed.y) + '%';
                                }
                                return label;
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
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            color: '#a3a3a3',
                            padding: 8
                        },
                        border: {
                            color: '#262626'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: '#262626',
                            lineWidth: 1
                        },
                        ticks: {
                            stepSize: 20,
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            color: '#a3a3a3',
                            padding: 8,
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        border: {
                            color: '#262626'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            },
            plugins: [{
                id: 'horizontalLine80',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const yAxis = chart.scales.y;
                    const y80 = yAxis.getPixelForValue(80);
                    
                    ctx.save();
                    // Draw a subtle shadow/glow effect
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(chart.chartArea.left, y80);
                    ctx.lineTo(chart.chartArea.right, y80);
                    ctx.stroke();
                    
                    // Draw the main goal line
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([]); // Solid line
                    ctx.beginPath();
                    ctx.moveTo(chart.chartArea.left, y80);
                    ctx.lineTo(chart.chartArea.right, y80);
                    ctx.stroke();
                    
                    // Add label above the line
                    ctx.fillStyle = '#22c55e';
                    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('80% Goal', chart.chartArea.right - 8, y80 - 6);
                    
                    ctx.restore();
                }
            }]
        });
        
        // Hide loading message
        document.querySelector('#combined-chart-container .loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading combined chart:', error);
        document.querySelector('#combined-chart-container .loading').textContent = 'Error loading chart data';
    }
}

// Fetch and setup daily charts with week switching
async function loadDailyCharts() {
    try {
        const response = await fetch('data/daily-charts-data.json');
        dailyChartData = await response.json();
        
        const container = document.getElementById('daily-chart-container');
        
        // Sort weeks
        const weekKeys = Object.keys(dailyChartData).sort((a, b) => {
            const numA = parseInt(a.replace('week_', ''));
            const numB = parseInt(b.replace('week_', ''));
            return numA - numB;
        });
        
        // Store latest week key for comparison
        const latestWeekKey = weekKeys[weekKeys.length - 1];
        
        // Create week selector buttons
        const weekSelector = document.getElementById('week-selector');
        const lastWeekIndex = weekKeys.length - 1;
        weekKeys.forEach((weekKey, index) => {
            const weekData = dailyChartData[weekKey];
            const btn = document.createElement('button');
            btn.className = `week-btn ${index === lastWeekIndex ? 'active' : ''}`;
            btn.textContent = `Week ${weekData.weekNumber}`;
            btn.dataset.weekKey = weekKey;
            btn.addEventListener('click', () => {
                // Update active button
                weekSelector.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Render chart for selected week
                renderDailyChart(weekKey, weekKey === latestWeekKey);
            });
            weekSelector.appendChild(btn);
        });
        
        // Render latest week by default
        if (weekKeys.length > 0) {
            renderDailyChart(weekKeys[lastWeekIndex], true);
        }
        
        // Hide loading message
        container.querySelector('.loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading daily charts:', error);
        document.getElementById('daily-chart-container').querySelector('.loading').textContent = 'Error loading daily charts data';
    }
}

// Render daily chart for a specific week
function renderDailyChart(weekKey, isLatestWeek = false) {
    const weekData = dailyChartData[weekKey];
    const ctx = document.getElementById('daily-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (dailyChartInstance) {
        dailyChartInstance.destroy();
    }
    
    // Check if this is the current week and get cutoff index
    const cutoffIndex = getDataCutoffIndex(weekData.weekNumber, isLatestWeek);
    
    // Helper function to truncate data array after cutoff index
    const truncateData = (dataArray) => {
        if (cutoffIndex >= 6) {
            // Past week or full week, return all data
            return dataArray;
        }
        // Current week, truncate after today (inclusive)
        const truncated = [...dataArray];
        for (let i = cutoffIndex + 1; i < truncated.length; i++) {
            truncated[i] = null;
        }
        return truncated;
    };
    
    const datasets = [];
    
    // Gym scores line
    if (weekData.gymScores && weekData.gymScores.length > 0) {
        datasets.push({
            label: 'Gym Task Score',
            data: truncateData(weekData.gymScores),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2.5,
            pointRadius: 6,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#0a0a0a',
            pointBorderWidth: 2,
            tension: 0.4,
            type: 'line',
            fill: false,
            spanGaps: false
        });
    }
    
    // Business scores line
    if (weekData.businessScores && weekData.businessScores.length > 0) {
        datasets.push({
            label: 'Business Task Score',
            data: truncateData(weekData.businessScores),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2.5,
            pointRadius: 6,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#0a0a0a',
            pointBorderWidth: 2,
            pointStyle: 'rect',
            tension: 0.4,
            type: 'line',
            fill: false,
            spanGaps: false
        });
    }
    
    // Gym measure bar (on Sunday, day 6)
    // Only show if it's past week or if today is Sunday or later
    if (weekData.gymMeasureScore !== null && weekData.gymMeasureScore !== undefined) {
        const gymBarData = new Array(7).fill(null);
        // Only show bar if it's a past week or if today is Sunday (day index 6)
        if (cutoffIndex >= 6) {
            gymBarData[6] = weekData.gymMeasureScore;
        }
        
        datasets.push({
            label: 'Gym Measure Score',
            data: gymBarData,
            backgroundColor: gymBarData.map(score => {
                if (!score) return 'transparent';
                if (score >= 100) return '#3b82f6';
                if (score >= 80) return '#60a5fa';
                if (score >= 50) return '#93c5fd';
                return '#dbeafe';
            }),
            borderColor: '#3b82f6',
            borderWidth: 0,
            type: 'bar',
            order: 0,
            barThickness: 32,
            categoryPercentage: 0.7,
            barPercentage: 0.6
        });
    }
    
    // Business measure bar (on Sunday, day 6)
    // Only show if it's past week or if today is Sunday or later
    if (weekData.businessMeasureScore !== null && weekData.businessMeasureScore !== undefined) {
        const businessBarData = new Array(7).fill(null);
        // Only show bar if it's a past week or if today is Sunday (day index 6)
        if (cutoffIndex >= 6) {
            businessBarData[6] = weekData.businessMeasureScore;
        }
        
        datasets.push({
            label: 'Business Measure Score',
            data: businessBarData,
            backgroundColor: businessBarData.map(score => {
                if (!score) return 'transparent';
                if (score >= 100) return '#ef4444';
                if (score >= 80) return '#f87171';
                if (score >= 50) return '#fca5a5';
                return '#fee2e2';
            }),
            borderColor: '#ef4444',
            borderWidth: 0,
            type: 'bar',
            order: 0,
            barThickness: 32,
            categoryPercentage: 0.7,
            barPercentage: 0.6
        });
    }
    
    dailyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekData.days,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 16,
                        usePointStyle: true,
                        color: '#a3a3a3',
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1f1f1f',
                    borderColor: '#404040',
                    borderWidth: 1,
                    padding: 12,
                    titleColor: '#ffffff',
                    bodyColor: '#a3a3a3',
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += Math.round(context.parsed.y) + '%';
                            }
                            return label;
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
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#a3a3a3',
                        padding: 12
                    },
                    border: {
                        color: '#262626'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 110,
                    grid: {
                        color: '#262626',
                        lineWidth: 1
                    },
                    ticks: {
                        stepSize: 20,
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#a3a3a3',
                        padding: 12,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    border: {
                        color: '#262626'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        },
        plugins: [{
            id: 'horizontalLine80',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const yAxis = chart.scales.y;
                const y80 = yAxis.getPixelForValue(80);
                
                ctx.save();
                // Draw a subtle shadow/glow effect
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left, y80);
                ctx.lineTo(chart.chartArea.right, y80);
                ctx.stroke();
                
                // Draw the main goal line
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([]); // Solid line
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left, y80);
                ctx.lineTo(chart.chartArea.right, y80);
                ctx.stroke();
                
                // Add label above the line
                ctx.fillStyle = '#22c55e';
                ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText('80% Goal', chart.chartArea.right - 8, y80 - 6);
                
                ctx.restore();
            }
        }]
    });
}

// Load all charts when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadCombinedChart();
    loadDailyCharts();
});

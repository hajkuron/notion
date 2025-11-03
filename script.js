let dailyChartInstance = null;
let dailyChartData = null;

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
                borderWidth: 2.5,
                pointRadius: 6,
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
                borderWidth: 2.5,
                pointRadius: 6,
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
                barThickness: 32,
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
                barThickness: 32,
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
            }
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
        
        // Create week selector buttons
        const weekSelector = document.getElementById('week-selector');
        weekKeys.forEach((weekKey, index) => {
            const weekData = dailyChartData[weekKey];
            const btn = document.createElement('button');
            btn.className = `week-btn ${index === 0 ? 'active' : ''}`;
            btn.textContent = `Week ${weekData.weekNumber}`;
            btn.dataset.weekKey = weekKey;
            btn.addEventListener('click', () => {
                // Update active button
                weekSelector.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Render chart for selected week
                renderDailyChart(weekKey);
            });
            weekSelector.appendChild(btn);
        });
        
        // Render first week by default
        if (weekKeys.length > 0) {
            renderDailyChart(weekKeys[0]);
        }
        
        // Hide loading message
        container.querySelector('.loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading daily charts:', error);
        document.getElementById('daily-chart-container').querySelector('.loading').textContent = 'Error loading daily charts data';
    }
}

// Render daily chart for a specific week
function renderDailyChart(weekKey) {
    const weekData = dailyChartData[weekKey];
    const ctx = document.getElementById('daily-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (dailyChartInstance) {
        dailyChartInstance.destroy();
    }
    
    const datasets = [];
    
    // Gym scores line
    if (weekData.gymScores && weekData.gymScores.length > 0) {
        datasets.push({
            label: 'Gym Task Score',
            data: weekData.gymScores,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2.5,
            pointRadius: 6,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#0a0a0a',
            pointBorderWidth: 2,
            tension: 0.4,
            type: 'line',
            fill: false
        });
    }
    
    // Business scores line
    if (weekData.businessScores && weekData.businessScores.length > 0) {
        datasets.push({
            label: 'Business Task Score',
            data: weekData.businessScores,
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
            fill: false
        });
    }
    
    // Gym measure bar (on Sunday, day 6)
    if (weekData.gymMeasureScore !== null && weekData.gymMeasureScore !== undefined) {
        const gymBarData = new Array(7).fill(null);
        gymBarData[6] = weekData.gymMeasureScore;
        
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
    if (weekData.businessMeasureScore !== null && weekData.businessMeasureScore !== undefined) {
        const businessBarData = new Array(7).fill(null);
        businessBarData[6] = weekData.businessMeasureScore;
        
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
        }
    });
}

// Load all charts when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadCombinedChart();
    loadDailyCharts();
});

let tasksData = null;
let taskChartInstances = {};
let currentWeek = null;

// Fetch and setup tasks with week switching
async function loadTasks() {
    try {
        const response = await fetch('data/individual-tasks-data.json');
        tasksData = await response.json();
        
        if (!tasksData || Object.keys(tasksData).length === 0) {
            document.getElementById('tasks-container').innerHTML = '<div class="loading">No task data available</div>';
            return;
        }
        
        // Get all available weeks from first task
        const firstTask = Object.values(tasksData)[0];
        const weekKeys = Object.keys(firstTask).sort((a, b) => {
            const numA = parseInt(a.replace('week_', ''));
            const numB = parseInt(b.replace('week_', ''));
            return numA - numB;
        });
        
        // Create week selector buttons
        const weekSelector = document.getElementById('week-selector');
        weekKeys.forEach((weekKey, index) => {
            const weekData = firstTask[weekKey];
            const btn = document.createElement('button');
            btn.className = `week-btn ${index === 0 ? 'active' : ''}`;
            btn.textContent = `Week ${weekData.weekNumber}`;
            btn.dataset.weekKey = weekKey;
            btn.addEventListener('click', () => {
                // Update active button
                weekSelector.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Render charts for selected week
                currentWeek = weekKey;
                renderTasksForWeek(weekKey);
            });
            weekSelector.appendChild(btn);
        });
        
        // Render first week by default
        if (weekKeys.length > 0) {
            currentWeek = weekKeys[0];
            renderTasksForWeek(weekKeys[0]);
        }
        
        // Hide loading message
        document.getElementById('tasks-container').innerHTML = '';
    } catch (error) {
        console.error('Error loading tasks:', error);
        document.getElementById('tasks-container').innerHTML = '<div class="loading">Error loading task data</div>';
    }
}

// Render all task charts for a specific week
function renderTasksForWeek(weekKey) {
    const container = document.getElementById('tasks-container');
    
    // Destroy existing charts
    Object.values(taskChartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    taskChartInstances = {};
    
    // Clear container
    container.innerHTML = '';
    
    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'tasks-grid';
    container.appendChild(grid);
    
    // Get task names sorted
    const taskNames = Object.keys(tasksData).sort();
    
    taskNames.forEach(taskName => {
        const taskWeeks = tasksData[taskName];
        const weekData = taskWeeks[weekKey];
        
        if (!weekData) return;
        
        // Create task card
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        
        const cardId = `task-${taskName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        taskCard.innerHTML = `
            <div class="task-card-title">${taskName}</div>
            <div class="task-frequency">Goal: ${weekData.frequency}</div>
            <div class="task-chart-wrapper">
                <canvas id="${cardId}"></canvas>
            </div>
        `;
        
        grid.appendChild(taskCard);
        
        // Create chart
        const ctx = document.getElementById(cardId).getContext('2d');
        
        // Determine color based on task category
        const isGymTask = taskName.includes('Workout') || taskName.includes('Nutrition');
        const lineColor = isGymTask ? '#3b82f6' : '#ef4444';
        const bgColor = isGymTask ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weekData.days,
                datasets: [
                    {
                        label: 'Progress',
                        data: weekData.scores,
                        borderColor: lineColor,
                        backgroundColor: bgColor,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: lineColor,
                        pointBorderColor: '#0a0a0a',
                        pointBorderWidth: 1.5,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Goal',
                        data: weekData.days.map(() => 100),
                        borderColor: '#525252',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        tension: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1f1f1f',
                        borderColor: '#404040',
                        borderWidth: 1,
                        padding: 10,
                        titleColor: '#ffffff',
                        bodyColor: '#a3a3a3',
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 1) {
                                    return 'Goal: 100%';
                                }
                                return Math.round(context.parsed.y) + '%';
                            },
                            filter: function(tooltipItem) {
                                // Show tooltip for both datasets
                                return true;
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
                                size: 10,
                                weight: '500'
                            },
                            color: '#a3a3a3',
                            padding: 6
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
                            stepSize: 25,
                            font: {
                                size: 10,
                                weight: '500'
                            },
                            color: '#a3a3a3',
                            padding: 6,
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
        
        taskChartInstances[cardId] = chart;
    });
}

// Load tasks when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});


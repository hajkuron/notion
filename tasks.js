let tasksData = null;
let taskChartInstances = {};
let currentWeek = null;

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
        
        // Store latest week key for comparison
        const latestWeekKey = weekKeys[weekKeys.length - 1];
        
        // Create week selector buttons
        const weekSelector = document.getElementById('week-selector');
        const lastWeekIndex = weekKeys.length - 1;
        weekKeys.forEach((weekKey, index) => {
            const weekData = firstTask[weekKey];
            const btn = document.createElement('button');
            btn.className = `week-btn ${index === lastWeekIndex ? 'active' : ''}`;
            btn.textContent = `Week ${weekData.weekNumber}`;
            btn.dataset.weekKey = weekKey;
            btn.addEventListener('click', () => {
                // Update active button
                weekSelector.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Render charts for selected week
                currentWeek = weekKey;
                renderTasksForWeek(weekKey, weekKey === latestWeekKey);
            });
            weekSelector.appendChild(btn);
        });
        
        // Render latest week by default
        if (weekKeys.length > 0) {
            currentWeek = weekKeys[lastWeekIndex];
            renderTasksForWeek(weekKeys[lastWeekIndex], true);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        document.getElementById('tasks-container').innerHTML = '<div class="loading">Error loading task data</div>';
    }
}

// Render all task charts for a specific week
function renderTasksForWeek(weekKey, isLatestWeek = false) {
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
    
    // Get cutoff index for this week
    let cutoffIndex = 6; // Default to show all days
    if (taskNames.length > 0) {
        const firstTask = tasksData[taskNames[0]];
        const weekData = firstTask[weekKey];
        if (weekData) {
            cutoffIndex = getDataCutoffIndex(weekData.weekNumber, isLatestWeek);
        }
    }
    
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
        
        // Create chart after DOM is updated
        requestAnimationFrame(() => {
            const canvas = document.getElementById(cardId);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
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
                            data: truncateData(weekData.scores),
                            borderColor: lineColor,
                            backgroundColor: bgColor,
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: lineColor,
                            pointBorderColor: '#0a0a0a',
                            pointBorderWidth: 1.5,
                            tension: 0.4,
                            fill: false,
                            spanGaps: false
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
    });
}

// Load tasks when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});


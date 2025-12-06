
import { setLoading, showToast } from '../core/utils.js';

let chartInstance = null;

export async function renderStats() {
    const kpiXp = document.getElementById('statsTotalXp');
    const kpiCount = document.getElementById('statsTotalActivities');
    const kpiRate = document.getElementById('statsWinRate');
    const recentList = document.getElementById('statsRecentList');

    if (!kpiXp) return; // Guard if elements missing

    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();

        // 1. KPIs
        kpiXp.textContent = data.total_xp || 0;
        
        const activityStats = data.activities || [];
        const totalCount = activityStats.reduce((sum, item) => sum + item.count, 0);
        const totalPassed = activityStats.reduce((sum, item) => sum + item.passed, 0);
        
        kpiCount.textContent = totalCount;
        const rate = totalCount > 0 ? Math.round((totalPassed / totalCount) * 100) : 0;
        kpiRate.textContent = `${rate}%`;

        // 2. Chart
        renderChart(activityStats);

        // 3. Recent History
        recentList.innerHTML = '';
        if (data.recent && data.recent.length > 0) {
            data.recent.forEach(item => {
                const li = document.createElement('li');
                li.className = 'history-item';
                
                const timeStr = new Date(item.created_at).toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                const statusClass = item.is_pass ? 'pass' : 'fail';
                const statusIcon = item.is_pass ? '✅' : '❌';
                
                let activityLabel = item.activity_type.toUpperCase();
                let detail = `${item.topic} · ${item.tense}`;

                li.innerHTML = `
                    <div class="hist-icon ${statusClass}">${statusIcon}</div>
                    <div class="hist-info">
                        <div class="hist-title">${activityLabel}</div>
                        <div class="hist-detail">${detail}</div>
                    </div>
                    <div class="hist-time">${timeStr}</div>
                `;
                recentList.appendChild(li);
            });
        } else {
            recentList.innerHTML = '<li style="padding:1rem; color:#94a3b8">No activity yet. Go practice!</li>';
        }

    } catch (err) {
        console.error(err);
        showToast('Error loading stats', 'error');
    }
}

function renderChart(data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    // Destroy existing chart to prevent canvas reuse error
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = data.map(d => d.activity_type.toUpperCase());
    const counts = data.map(d => d.count);
    const passed = data.map(d => d.passed);

    // Chart.js requires array for datasets
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Passed',
                    data: passed,
                    backgroundColor: '#22c55e',
                    borderRadius: 4,
                },
                {
                    label: 'Total',
                    data: counts,
                    backgroundColor: '#38bdf8',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

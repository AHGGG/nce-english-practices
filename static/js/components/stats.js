// Stats Component - XP tracking and history display

import { elements } from '../core/elements.js';
import { fetchStats } from '../core/api.js';

export async function openStats() {
    elements.statsModal.classList.remove('hidden');
    elements.totalXp.textContent = '...';
    elements.activityStats.innerHTML = 'Loading...';
    elements.recentHistory.innerHTML = '';
    
    try {
        const data = await fetchStats();
        
        elements.totalXp.textContent = data.total_xp;
        
        elements.activityStats.innerHTML = data.activities.map(a => `
            <div class="activity-item">
                <strong>${a.count}</strong>
                <span style="font-size:0.8rem;text-transform:capitalize;color:#94a3b8">${a.activity_type}</span>
            </div>
        `).join('');
        
        elements.recentHistory.innerHTML = data.recent.map(r => `
            <li>
                <div>
                    <span style="font-weight:600;text-transform:capitalize">${r.activity_type}</span>
                    <span style="font-size:0.8rem;color:#64748b;margin-left:0.5rem">${r.topic || '-'} (${r.tense || '-'})</span>
                </div>
                <span class="${r.is_pass ? 'status-pass' : 'status-fail'}">
                    ${r.is_pass ? 'Pass' : 'Fail'}
                </span>
            </li>
        `).join('');
    } catch (e) {
        elements.totalXp.textContent = 'Err';
    }
}

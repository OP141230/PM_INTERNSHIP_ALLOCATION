const API = '/api';
let charts = {};
window.currentMatches = {};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupNavigation();
    loadDashboard();
    loadCandidates();
    loadInternships();
    loadMatchSelect();
    
    document.getElementById('resetBtn').addEventListener('click', resetData);
    document.getElementById('demoBtn').addEventListener('click', runSimulation);
    document.getElementById('runMatchBtn').addEventListener('click', runMatching);
    document.getElementById('runAllocBtn').addEventListener('click', runAllocation);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('candSearch').addEventListener('input', filterCandidates);
});

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const view = link.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${view}`).classList.add('active');
            document.getElementById('pageTitle').textContent = link.textContent.trim();
            
            if (view === 'analytics') loadAnalytics();
            if (view === 'allocations') loadAllocations();
        });
    });
}

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${endpoint}`, opts);
    if (!res.ok) {
        console.error(`API Error: ${res.status} ${res.statusText} for ${endpoint}`);
        throw new Error(`API Error: ${res.status}`);
    }
    return res.json();
}
async function loadDashboard() {
    const data = await fetchAPI('/analytics');
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = `
        <div class="stat-card"><div class="stat-label">Total Candidates</div><div class="stat-value">${data.total_candidates}</div></div>
        <div class="stat-card"><div class="stat-label">Total Internships</div><div class="stat-value">${data.total_internships}</div></div>
        <div class="stat-card"><div class="stat-label">Available Seats</div><div class="stat-value">${data.available_seats}</div></div>
        <div class="stat-card"><div class="stat-label">Successful Allocations</div><div class="stat-value">${data.successful_allocations}</div></div>
        <div class="stat-card"><div class="stat-label">Avg Match Score</div><div class="stat-value">${data.avg_match_score}%</div></div>
        <div class="stat-card"><div class="stat-label">Allocation Rate</div><div class="stat-value">${data.allocation_rate}%</div></div>
        <div class="stat-card"><div class="stat-label">Rural Representation</div><div class="stat-value">${data.rural_rep}%</div></div>
        <!-- Replaced Aspirational card with a Pending card -->
        <div class="stat-card"><div class="stat-label">Pending Candidates</div><div class="stat-value">${data.allocation_status.Pending}</div></div>
    `;
    
    renderChart('chartSector', 'doughnut', Object.keys(data.sector_distribution), Object.values(data.sector_distribution));
    renderChart('chartStatus', 'doughnut', Object.keys(data.allocation_status), Object.values(data.allocation_status));
    renderChart('chartRural', 'pie', Object.keys(data.rural_urban), Object.values(data.rural_urban));
    
    renderChart('chartScores', 'bar', Object.keys(data.score_distribution), Object.values(data.score_distribution));
}function renderChart(id, type, labels, data) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id).getContext('2d');

    const GOV_COLORS = [
        '#FF671F', '#003580', '#138808', '#FF9A3C', '#1a6ab5', '#00897b',
        '#e65100', '#5c9fd4', '#66bb6a', '#bf360c', '#1565c0', '#004d40'
    ];

    const bgColors = data.map((_, i) => GOV_COLORS[i % GOV_COLORS.length]);

    charts[id] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Candidates',
                data: data,
                backgroundColor: bgColors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: type !== 'bar',
                    labels: { color: '#1A1A2E', font: { size: 12 } }
                }
            },
            scales: type === 'bar' ? {
                y: { ticks: { color: '#5A6480' }, grid: { color: '#e0e8f0' } },
                x: { ticks: { color: '#5A6480' }, grid: { color: '#e0e8f0' } }
            } : {}
        }
    });
}

async function loadCandidates() {
    const data = await fetchAPI('/candidates');
    renderCandidateTable(data);
}
function renderCandidateTable(data) {
    const tbody = document.querySelector('#candidatesTable tbody');
    tbody.innerHTML = data.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.qualification}</td>
            <td>${c.skills.join(', ')}</td>
            <td>${c.preferred_location}</td>
            <td>${c.location_type}</td>
            <!-- Render State instead of the Eligible badge -->
            <td><span class="badge badge-success">${c.state}</span></td>
        </tr>
    `).join('');
}


function filterCandidates() {
    const term = document.getElementById('candSearch').value.toLowerCase();
    fetchAPI('/candidates').then(data => {
        const filtered = data.filter(c => 
            c.name.toLowerCase().includes(term) || 
            c.skills.join(' ').toLowerCase().includes(term) ||
            c.qualification.toLowerCase().includes(term)
        );
        renderCandidateTable(filtered);
    });
}

async function loadInternships() {
    const data = await fetchAPI('/internships');
    const grid = document.getElementById('internshipsGrid');
    grid.innerHTML = data.map(i => {
        const pct = (i.filled / i.capacity) * 100;
        return `
        <div class="intern-card">
            <div class="intern-header">
                <span class="intern-company">${i.company}</span>
                <span class="badge badge-success">${i.sector}</span>
            </div>
            <div class="intern-role">${i.role} • ${i.location}</div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
            <div class="progress-text">${i.filled} / ${i.capacity} filled</div>
        </div>
        `;
    }).join('');
}

async function loadMatchSelect() {
    const data = await fetchAPI('/candidates');
    const select = document.getElementById('matchCandSelect');
    select.innerHTML = '<option value="">Select Candidate...</option>' + 
        data.map(c => `<option value="${c.id}">${c.name} (${c.qualification})</option>`).join('');
}

async function runMatching() {
    const candId = document.getElementById('matchCandSelect').value;
    if (!candId) return;
    
    const matches = await fetchAPI('/match', 'POST', { candidate_id: parseInt(candId) });
    const container = document.getElementById('matchResults');
    
    window.currentMatches = {};
    container.innerHTML = matches.map(m => {
        window.currentMatches[m.internship_id] = m;
        return `
        <div class="match-card">
            <div class="match-info">
                <h4>${m.company}</h4>
                <div class="match-meta">${m.role} • ${m.location} • ${m.sector}</div>
                <div class="match-reasons">
                    ${m.reasons.map(r => `<span>✓ ${r}</span>`).join('')}
                </div>
                <div class="match-actions">
                    <button class="btn-outline" onclick="showBreakdown(${m.internship_id})">View Breakdown</button>
                    <button class="btn-primary" onclick="allocateSingle(${m.candidate_id}, ${m.internship_id})">Allocate</button>
                </div>
            </div>
            <div class="match-score-box">
                <div class="score">${m.final_score}%</div>
                <div class="score-label">Match Score</div>
            </div>
        </div>
    `}).join('');
}

function showBreakdown(internId) {
    const match = window.currentMatches[internId];
    if (!match) return;
    
    const body = document.getElementById('breakdownBody');
    body.innerHTML = `
        <div class="alloc-stats">
            <div class="alloc-stat"><div class="val">${match.match_score}%</div><div class="lbl">Base Match</div></div>
            <div class="alloc-stat"><div class="val">+${match.adjustment}</div><div class="lbl">Policy Adj</div></div>
            <div class="alloc-stat"><div class="val">-${match.penalty}</div><div class="lbl">Penalty</div></div>
        </div>
        <h4 style="margin-bottom: 12px;">Detailed Breakdown</h4>
        <table>
            <tr><td>Skills (35%)</td><td>${match.breakdown.skill}/35</td></tr>
            <tr><td>Qualification (20%)</td><td>${match.breakdown.qualification}/20</td></tr>
            <tr><td>Sector (15%)</td><td>${match.breakdown.sector}/15</td></tr>
            <tr><td>Location (10%)</td><td>${match.breakdown.location}/10</td></tr>
            <tr><td>Role (20%)</td><td>${match.breakdown.role}/20</td></tr>
        </table>
    `;
    openModal('breakdownModal');
    
}
async function allocateSingle(candId, internId) {
    try {
        await fetchAPI('/allocate_single', 'POST', { candidate_id: candId, internship_id: internId });
        alert('Candidate allocated successfully!');
        loadInternships();
        loadDashboard();
        runMatching(); 
    } catch (e) {
        alert(e.message || 'Failed to allocate candidate.');
    }
}

async function runAllocation() {
    const res = await fetchAPI('/allocate', 'POST');
    alert(`Allocation Complete! ${res.allocated} allocated, ${res.pending} pending.`);
    loadAllocations();
    loadDashboard();
}

async function loadAllocations() {
    const data = await fetchAPI('/allocations');
    const stats = document.getElementById('allocStats');
    const avgScore = data.allocations.length > 0 ? (data.allocations.reduce((a, b) => a + b.final_score, 0) / data.allocations.length).toFixed(1) : 0;
    
    stats.innerHTML = `
        <div class="alloc-stat"><div class="val">${data.allocations.length}</div><div class="lbl">Allocated</div></div>
        <div class="alloc-stat"><div class="val">${data.pending.length}</div><div class="lbl">Pending</div></div>
        <div class="alloc-stat"><div class="val">${avgScore}%</div><div class="lbl">Avg Score</div></div>
    `;
    
    const tbody = document.querySelector('#allocTable tbody');
    const all = [
        ...data.allocations.map(a => ({...a, status: 'Allocated'})),
        ...data.pending.map(p => ({candidate_name: p.candidate.name, company: 'N/A', role: 'N/A', location: 'N/A', final_score: 0, status: 'Pending'}))
    ];
    
    tbody.innerHTML = all.map(a => `
        <tr>
            <td>${a.candidate_name}</td>
            <td>${a.company}</td>
            <td>${a.role}</td>
            <td>${a.location}</td>
            <td>${a.final_score}%</td>
            <td><span class="badge ${a.status === 'Allocated' ? 'badge-success' : 'badge-warning'}">${a.status}</span></td>
        </tr>
    `).join('');
}

async function exportCSV() {
    const data = await fetchAPI('/allocations');
    let csv = 'Candidate,Company,Role,Location,Score,Status\n';
    data.allocations.forEach(a => csv += `${a.candidate_name},${a.company},${a.role},${a.location},${a.final_score},Allocated\n`);
    data.pending.forEach(p => csv += `${p.candidate.name},N/A,N/A,N/A,0,Pending\n`);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allocations.csv';
    a.click();
}

async function loadAnalytics() {
    const data = await fetchAPI('/analytics');
    renderChart('chartCapacity', 'bar', 
        data.capacity_utilization.map(c => c.company), 
        data.capacity_utilization.map(c => c.filled)
    );
    
    const stateData = {};
    const cands = await fetchAPI('/candidates');
    cands.forEach(c => stateData[c.state] = (stateData[c.state] || 0) + 1);
    renderChart('chartState', 'doughnut', Object.keys(stateData), Object.values(stateData));
}

async function resetData() {
    await fetchAPI('/reset', 'POST');
    location.reload();
}

function runSimulation() {
    openModal('simModal');
    const steps = [
        'Analyzing 100+ candidates...',
        'Calculating skill compatibility...',
        'Checking eligibility criteria...',
        'Applying allocation policies...',
        'Checking internship capacity...',
        'Finalizing allocations...'
    ];
    
    const container = document.getElementById('simSteps');
    container.innerHTML = steps.map((s, i) => `
        <div class="sim-step" id="step-${i}">
            <span class="step-icon"><span class="spinner"></span></span> 
            ${s}
        </div>
    `).join('');
    
    let current = 0;
    const interval = setInterval(() => {
        if (current > 0) {
            const prevStep = document.getElementById(`step-${current-1}`);
            prevStep.classList.remove('active');
            prevStep.classList.add('done');
        }
        
        if (current < steps.length) {
            const currStep = document.getElementById(`step-${current}`);
            currStep.classList.add('active');
            current++;
        } else {
            clearInterval(interval);
            setTimeout(async () => {
                closeModal('simModal');
                try {
                    await fetchAPI('/allocate', 'POST');
                    loadDashboard();
                    loadAllocations();
                    document.querySelector('.nav-link[data-view="allocations"]').click();
                } catch (e) {
                    console.error('Allocation error:', e);
                    alert('Simulation finished, but allocation failed. Check console for details.');
                }
            }, 500);
        }
    }, 800);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }


async function submitApplication() {
    const cgpaVal = document.getElementById('app_cgpa').value;
    
    const payload = {
        name: document.getElementById('app_name').value,
        cgpa: cgpaVal ? parseFloat(cgpaVal) : null,
        qualification: document.getElementById('app_qual').value,
        skills: document.getElementById('app_skills').value.split(',').map(s => s.trim()),
        state: document.getElementById('app_state').value, // Grabbing state
        sector: document.getElementById('app_sector').value,
        role: document.getElementById('app_role').value,
        current_location: document.getElementById('app_curr_loc').value,
        location_type: document.getElementById('app_loc_type').value,
        preferred_location: document.getElementById('app_pref_loc').value
    };
    
    await fetchAPI('/apply', 'POST', payload);
    closeModal('applyModal');
    loadCandidates();
    loadMatchSelect();
    alert('Application submitted successfully!');
}

async function submitInternship() {
    const payload = {
        company: document.getElementById('post_company').value,
        role: document.getElementById('post_role').value,
        location: document.getElementById('post_loc').value,
        sector: document.getElementById('post_sector').value,
        skills: document.getElementById('post_skills').value.split(',').map(s => s.trim()),
        capacity: document.getElementById('post_cap').value
    };
    await fetchAPI('/post_internship', 'POST', payload);
    closeModal('postModal');
    loadInternships();
    alert('Internship posted successfully!');
}
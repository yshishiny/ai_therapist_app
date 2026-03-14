// Navigation Logic
window.switchView = (viewId) => {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.style.display = 'block';
  } else {
    console.error(`View ${viewId} not found`);
    return;
  }

  // Update Active Nav
  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  const navItem = document.getElementById(`nav-${viewId}`);
  if (navItem) navItem.classList.add('active');

  // Trigger view-specific renders
  if (viewId === 'calendar') renderCalendar();
  if (viewId === 'dashboard') renderDashboardData();
  if (viewId === 'patients') renderPatientsDetail();
  if (viewId === 'assessments') renderAssessmentsView();
};

// Data & State
const patients = [
  { id: 821, name: "Sarah Johnson", status: "Active", last: "Today", risk: "Med", riskLabel: "Medium", next: "Draft SOAP" },
  { id: 402, name: "Michael Chen", status: "Active", last: "2 days ago", risk: "Low", riskLabel: "Low", next: "Review PHQ-9" },
  { id: 105, name: "Ahmed Hassan", status: "Urgent", last: "1h ago", risk: "High", riskLabel: "High", next: "Crisis Log" },
  { id: 334, name: "Elena Rodriguez", status: "Active", last: "Yesterday", risk: "Low", riskLabel: "Low", next: "Send Reminders" },
  { id: 912, name: "James Wilson", status: "Paused", last: "1 week ago", risk: "Med", riskLabel: "Medium", next: "Follow up" }
];

const appointments = [
  { day: 3, time: "09:00 AM", patient: "Sarah Johnson", type: "clinical", Label: "CBT Session" },
  { day: 3, time: "11:30 AM", patient: "Michael Chen", type: "intake", Label: "Initial Intake" },
  { day: 3, time: "02:00 PM", patient: "Ahmed Hassan", type: "urgent", Label: "Crisis Follow-up" },
  { day: 4, time: "10:00 AM", patient: "Elena Rodriguez", type: "clinical", Label: "Weekly Check-in" },
  { day: 4, time: "01:00 PM", patient: "James Wilson", type: "clinical", Label: "CBT Session" }
];

const assessments = {
  personality: {
    title: "Quick Personality Assessment",
    guide: `
      <p>Simplified Tier-1 personality scan based on the BFI-10 model.</p>
      <p><strong>Clinical Utility:</strong> Used during intake to establish baseline temperament and communication style preferences.</p>
      <ul>
        <li>Trait Spectrum: Extraversion, Agreeableness, Conscientiousness, Neuroticism, Openness.</li>
      </ul>
    `,
    questions: [
      "I see myself as extraverted, enthusiastic.",
      "I see myself as critical, quarrelsome.",
      "I see myself as dependable, self-disciplined.",
      "I see myself as anxious, easily upset.",
      "I see myself as open to new experiences, complex."
    ],
    options: ["Disagree", "Neither", "Agree", "Strongly Agree"]
  },
  phq9: {
    title: "PHQ-9 (Depression Screening)",
    guide: `
      <p>The Patient Health Questionnaire-9 is a multipurpose instrument for screening, diagnosing, monitoring and measuring the severity of depression.</p>
      <p><strong>Scoring Interpretation:</strong></p>
      <ul>
        <li>0-4: Minimal</li>
        <li>5-9: Mild</li>
        <li>10-14: Moderate</li>
        <li>15-19: Moderately Severe</li>
        <li>20+: Severe</li>
      </ul>
    `,
    questions: [
      "Little interest or pleasure in doing things?",
      "Feeling down, depressed, or hopeless?",
      "Trouble falling or staying asleep, or sleeping too much?",
      "Feeling tired or having little energy?",
      "Poor appetite or overeating?"
    ],
    options: ["Not at all", "Several days", "More than half", "Nearly every day"]
  },
  gad7: {
    title: "GAD-7 (Anxiety Screening)",
    guide: `
      <p>The GAD-7 is a sensitive self-report scale to identify probable cases of Generalized Anxiety Disorder.</p>
      <p><strong>Clinical Utility:</strong> Monitoring response to treatment and identifying comorbid anxiety symptoms.</p>
    `,
    questions: [
      "Feeling nervous, anxious or on edge?",
      "Not being able to stop or control worrying?",
      "Worrying too much about different things?",
      "Trouble relaxing?",
      "Being so restless that it is hard to sit still?"
    ],
    options: ["Not at all", "Several days", "More than half", "Nearly every day"]
  },
  ace: {
    title: "ACE (Adverse Childhood Experiences)",
    guide: `
      <p>The ACE score is a tool for identifying developmental trauma history.</p>
      <p><strong>Impact:</strong> High ACE scores are strongly correlated with chronic health conditions and clinical mental health outcomes.</p>
    `,
    questions: [
        "Did a parent or adult in the household often swear at you, insult you, or put you down?",
        "Did you often feel that no one in your family loved you or thought you were important?",
        "Did you often feel that you didn't have enough to eat, had to wear dirty clothes, or had no one to protect you?",
        "Were your parents ever separated or divorced?",
        "Did you live with anyone who was a problem drinker or used street drugs?"
    ],
    options: ["No", "Yes"]
  }
};

let currentAssessment = null;
let trendsChart = null;

// Renderers
const renderPatientRow = (p) => `
  <tr onclick="viewPatient(${p.id})" style="cursor: pointer;">
    <td>${p.name} <span style="font-size: 11px; color: #999;">#${p.id}</span></td>
    <td><span class="tag ${p.status.toLowerCase()}">${p.status}</span></td>
    <td>${p.last}</td>
    <td><span class="dot ${p.risk.toLowerCase()}"></span> ${p.riskLabel}</td>
    <td><button class="btn-sm ${p.risk === 'High' ? 'primary' : ''}">${p.next}</button></td>
  </tr>
`;

window.viewPatient = (id) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    // Switch View
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-patient-detail').style.display = 'block';
    
    // Set Header
    document.getElementById('detailPatientName').innerText = `${patient.name} - Clinical Profile`;
    
    // Render Default Folder (Input)
    openFolder('input', id);
    
    // Render AI hints
    renderHints(id);
};

window.openFolder = (folderName, patientId) => {
    const content = document.getElementById('fileExplorerContent');
    if (!content) return;

    // Update active state in UI
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
        if (item.innerText.toLowerCase().includes(folderName)) item.classList.add('active');
    });

    const files = {
        input: [
            { name: "Intake_Form_Scanned.pdf", date: "2024-02-01", size: "2.4MB" },
            { name: "Session_1_Audio_Raw.m4a", date: "2024-02-05", size: "12MB" },
            { name: "Handwritten_Notes.jpg", date: "2024-02-05", size: "1.1MB" }
        ],
        processed: [
            { name: "Session_1_Transcript.docx", date: "2024-02-06", size: "45KB" },
            { name: "Entities_Extracted.json", date: "2024-02-06", size: "12KB" }
        ],
        output: [
            { name: "Summary_Week_1.pdf", date: "2024-02-07", size: "120KB" },
            { name: "SOAP_Note_Draft.pdf", date: "2024-02-07", size: "88KB" }
        ],
        reports: [
            { name: "Comprehensive_Psych_Report.pdf", date: "2024-02-08", size: "1.5MB" }
        ]
    };

    content.innerHTML = (files[folderName] || []).map(f => `
        <div class="file-item">
            <span class="file-icon">📄</span>
            <div class="file-info">
                <span class="file-name">${f.name}</span>
                <span class="file-meta">${f.date} • ${f.size}</span>
            </div>
            <button class="btn-icon">👁️</button>
        </div>
    `).join('');
};

const renderHints = (id) => {
    const hintsCont = document.getElementById('aiHintsContent');
    if (!hintsCont) return;

    const mockHints = [
        { type: "urgent", text: "Recent spike in GAD-7 (Anxiety) suggest urgent review of sleep hygiene.", icon: "⚠️" },
        { type: "insight", text: "Recurring mentions of 'work-life balance'. Suggest Cognitive Reframing exercises.", icon: "💡" },
        { type: "pattern", text: "Patient is 15% more talkative in morning sessions vs evening.", icon: "📈" }
    ];

    hintsCont.innerHTML = mockHints.map(h => `
        <div class="hint-card ${h.type}">
            <span class="hint-icon">${h.icon}</span>
            <p>${h.text}</p>
        </div>
    `).join('');
};

window.simulateUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        const file = e.target.files[0];
        alert(`Uploading ${file.name} to Dr. Heba's secure clinical archive...\nProcessing for automated analysis.`);
    };
    input.click();
};

const renderDashboardData = () => {
    const tableBody = document.getElementById('patientTableBodyDashboard');
    if (tableBody) tableBody.innerHTML = patients.slice(0, 3).map(p => renderPatientRow(p)).join('');
    
    // Chart init logic
    const chartEl = document.getElementById('trendsChart');
    if (chartEl) {
        if (trendsChart) trendsChart.destroy();
        trendsChart = new Chart(chartEl.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                datasets: [{
                    label: 'Avg PHQ-9',
                    data: [14, 12, 15, 11, 9, 7],
                    borderColor: '#d98e7d',
                    backgroundColor: 'rgba(217, 142, 125, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Avg GAD-7',
                    data: [18, 16, 14, 15, 12, 10],
                    borderColor: '#8FB9A8',
                    backgroundColor: 'rgba(143, 185, 168, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales: { 
                    y: { beginAtZero: true, max: 27, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
};

const renderPatientsDetail = () => {
    const tableBody = document.getElementById('patientTableBodyDetail');
    if (tableBody) tableBody.innerHTML = patients.map(p => renderPatientRow(p)).join('');
};

const renderCalendar = () => {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = "";
  // Simple 7-day grid rendering
  for (let i = 0; i < 7; i++) {
    const daySlots = appointments.filter(a => a.day === i);
    const dayHtml = daySlots.map(a => `
      <div class="appointment-card ${a.type}">
        <span class="appt-time">${a.time}</span>
        <span class="appt-name">${a.patient}</span>
        <div style="font-size: 10px; opacity: 0.8;">${a.Label}</div>
      </div>
    `).join('');
    grid.innerHTML += `<div class="calendar-slot">${dayHtml}</div>`;
  }
};

const renderAssessmentsView = () => {
    const tableBody = document.getElementById('reportsTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td>Today</td>
                <td>Sarah Johnson</td>
                <td>PHQ-9</td>
                <td>8</td>
                <td><span class="dot med"></span> Moderate</td>
            </tr>
            <tr>
                <td>Yesterday</td>
                <td>Ahmed Hassan</td>
                <td>ACE</td>
                <td>4</td>
                <td><span class="dot high"></span> High Resource Need</td>
            </tr>
        `;
    }
}

// Assessment Modal Logic
window.openAssessment = (type) => {
  currentAssessment = type;
  const data = assessments[type];
  if (!data) return;

  const modal = document.getElementById('assessmentModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const guide = document.getElementById('guideContent');
  const submitBtn = document.getElementById('submitBtn');

  title.innerText = data.title;
  guide.innerHTML = data.guide || "<p>No guide available for this test.</p>";
  submitBtn.style.display = 'block';
  
  body.innerHTML = data.questions.map((q, i) => `
    <div class="question-item">
      <span class="question-text">${i + 1}. ${q}</span>
      <div class="options-grid">
        ${data.options.map((opt, oi) => `
          <label>
            <input type="radio" name="q${i}" value="${oi}" required>
            <div class="option-btn">${opt}</div>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  modal.style.display = 'block';
};

window.closeModal = () => {
  document.getElementById('assessmentModal').style.display = 'none';
};

window.submitAssessment = () => {
  const formValues = Array.from(document.querySelectorAll('input[type="radio"]:checked')).map(i => parseInt(i.value));
  if (formValues.length < assessments[currentAssessment].questions.length) {
    alert('Please answer all questions.');
    return;
  }

  const score = formValues.reduce((a, b) => a + b, 0);
  let severity = "Low";
  let classList = "low";
  if (score > 12) { severity = "High"; classList = "high"; }
  else if (score > 7) { severity = "Moderate"; classList = "med"; }

  document.getElementById('modalBody').innerHTML = `
    <div class="results-view">
      <h3>Assessment Complete</h3>
      <span class="score-badge">${score}</span>
      <span class="severity-tag ${classList}">${severity} Indicators Detected</span>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">Results have been logged and added to the patient profile for Review.</p>
    </div>
  `;
  document.getElementById('submitBtn').style.display = 'none';
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderDashboardData();
    // Re-init chart on window resize for responsiveness
    window.addEventListener('resize', () => {
        if (document.getElementById('view-dashboard').style.display !== 'none') {
            renderDashboardData();
        }
    });
});

console.log('AI Therapist Professional Dashboard Loaded.');

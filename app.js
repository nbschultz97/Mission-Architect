// Ceradon Mission Architect - vanilla JS SPA
(function () {
  const storageKey = 'ceradonMissionArchitectMissions';
  let missions = [];
  let currentMission = null;

  const altitudeBands = ['Surface', 'Low', 'Medium', 'High', 'Stratospheric'];
  const temperatureBands = ['Cold', 'Temperate', 'Hot', 'Extreme'];

  const defaultPhases = [
    { id: 'ORP', name: 'ORP', description: 'Objective Rally Point setup', tasks: [], assetsUsed: [] },
    { id: 'INFIL', name: 'Infil', description: 'Movement to objective', tasks: [], assetsUsed: [] },
    { id: 'ON_STATION', name: 'On-Station', description: 'Operations on target', tasks: [], assetsUsed: [] },
    { id: 'EXFIL', name: 'Exfil', description: 'Withdraw and recover', tasks: [], assetsUsed: [] }
  ];

  /** Utility **/
  const uuid = () => 'id-' + Math.random().toString(36).substring(2, 9);
  const saveToStorage = () => localStorage.setItem(storageKey, JSON.stringify(missions));
  const loadFromStorage = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const findMissionIndex = (id) => missions.findIndex((m) => m.id === id);

  function createNewMission() {
    currentMission = {
      id: uuid(),
      missionMeta: {
        name: '',
        classificationBanner: 'UNCLASSIFIED // TRAINING USE',
        ao: '',
        unitOrDetachment: '',
        createdOn: new Date().toISOString().split('T')[0],
        createdBy: '',
        missionType: 'Recon',
        durationHours: 0,
        altitudeBand: 'Surface',
        temperatureBand: 'Temperate'
      },
      phases: JSON.parse(JSON.stringify(defaultPhases)),
      assets: [],
      assignments: [],
      imports: {
        nodes: [],
        platforms: [],
        mesh: null
      },
      constraints: {
        timeWindow: '',
        environment: '',
        rfConstraints: '',
        logisticsConstraints: '',
        successCriteria: [],
        riskNotes: ''
      }
    };
    renderAll();
  }

  function createExampleMission() {
    currentMission = {
      id: uuid(),
      missionMeta: {
        name: 'Fjord Recon Lane',
        classificationBanner: 'UNCLASSIFIED // TRAINING USE',
        ao: 'Nordic fjord complex, austere cold-weather',
        unitOrDetachment: 'Bravo Troop / Team Vantage',
        createdOn: new Date().toISOString().split('T')[0],
        createdBy: 'Planner X',
        missionType: 'Recon',
        durationHours: 48,
        altitudeBand: 'Low',
        temperatureBand: 'Cold'
      },
      phases: [
        {
          id: 'ORP',
          name: 'ORP',
          description: 'Stage at ORP, final pre-comms, kit check',
          startCondition: 'H-2 established ORP',
          endCondition: 'Teams ready to step',
          tasks: ['Final CSI node config', 'Mesh relay power check', 'Brief EMCON plan'],
          assetsUsed: [],
          emconConsiderations: 'Low-power checks only'
        },
        {
          id: 'INFIL',
          name: 'Infil',
          description: 'Split infil along valley floor',
          startCondition: 'Step off H-0',
          endCondition: 'Teams in position',
          tasks: ['FPV relay overwatch', 'Mule UGV hauls resupply kit'],
          assetsUsed: [],
          emconConsiderations: 'RF minimal, passive listening'
        },
        {
          id: 'ON_STATION',
          name: 'On-Station',
          description: 'ISR and mesh soak',
          startCondition: 'Teams set ORP overwatch',
          endCondition: 'Collection complete',
          tasks: ['Deploy Vantage CSI nodes', 'Record CSI for pose tracking trial', 'Logistics check every 2 hrs'],
          assetsUsed: [],
          emconConsiderations: 'Directional links preferred'
        },
        {
          id: 'EXFIL',
          name: 'Exfil',
          description: 'Recover nodes and depart',
          startCondition: 'Call sign Vantage ready',
          endCondition: 'Back through ORP',
          tasks: ['Recover CSI nodes', 'Secure captures for offline pose inference'],
          assetsUsed: [],
          emconConsiderations: 'Burst mesh updates only'
        }
      ],
      assets: getDemoAssets(),
      assignments: [],
      imports: {
        nodes: [],
        platforms: [],
        mesh: null
      },
      constraints: {
        timeWindow: 'H+0 to H+48',
        environment: 'Cold-weather fjord, mixed rocky ridgeline',
        rfConstraints: 'Deep valley, multipath heavy; prefer elevated relays',
        logisticsConstraints: 'UGV battery swap every 6 hrs',
        successCriteria: ['No fratricide', 'ISR coverage of target bay', 'Recover all kit with CSI logs intact'],
        riskNotes: 'EW sniffers possible; maintain EMCON discipline'
      }
    };
    // seed asset usage
    const assets = currentMission.assets.map((a) => a.id);
    currentMission.phases.forEach((p, idx) => {
      p.assetsUsed = idx === 1 ? assets.filter((_, i) => i < 3) : assets.filter((_, i) => i % 2 === 0);
    });
    renderAll();
  }

  function getDemoAssets() {
    return [
      {
        id: uuid(),
        name: 'Vantage CSI Node Alpha',
        type: 'NODE',
        sourceTool: 'NodeArchitect',
        roleTags: ['CSI', 'recon', 'through-wall'],
        ownerElement: 'Team Vantage',
        notes: 'Primary CSI capture node'
      },
      {
        id: uuid(),
        name: 'FPV Relay Quad',
        type: 'UXS',
        sourceTool: 'UxSArchitect',
        roleTags: ['relay', 'overwatch'],
        ownerElement: 'Air det',
        notes: 'Loitering mesh overwatch'
      },
      {
        id: uuid(),
        name: 'Ground Mesh Relay',
        type: 'MESH_ELEMENT',
        sourceTool: 'MeshArchitect',
        roleTags: ['backbone', 'mesh'],
        ownerElement: 'Signal',
        notes: 'Drop-in relay with mast'
      },
      {
        id: uuid(),
        name: 'Resupply Mule UGV',
        type: 'UXS',
        sourceTool: 'UxSArchitect',
        roleTags: ['logistics', 'hauler'],
        ownerElement: 'Support',
        notes: 'Carries sustainment kit'
      },
      {
        id: uuid(),
        name: 'Light RF Kit',
        type: 'KIT',
        sourceTool: 'KitSmith',
        roleTags: ['RF', 'signals'],
        ownerElement: 'Team Vantage',
        notes: 'Batteries, filters, SDRs'
      }
    ];
  }

  /** Rendering **/
  function renderAll() {
    if (!currentMission) return;
    renderNav();
    renderSetup();
    renderPhases();
    renderAssets();
    renderAssignments();
    renderConstraints();
    renderBrief();
    renderSavedMissions();
    renderAssignmentMatrix();
  }

  function renderNav() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.remove('active');
      btn.addEventListener('click', () => switchPanel(btn.dataset.target));
      if (btn.dataset.target === document.querySelector('.panel.active')?.id) btn.classList.add('active');
    });
  }

  function switchPanel(id) {
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.target === id);
    });
  }

  function renderSetup() {
    const meta = currentMission.missionMeta || {};
    const altitudeSelect = document.getElementById('missionAltitude');
    const temperatureSelect = document.getElementById('missionTemperature');
    altitudeSelect.innerHTML = altitudeBands.map((band) => `<option value="${band}">${band}</option>`).join('');
    temperatureSelect.innerHTML = temperatureBands.map((band) => `<option value="${band}">${band}</option>`).join('');
    document.getElementById('missionName').value = meta.name || currentMission.name || '';
    document.getElementById('missionType').value = meta.missionType || currentMission.missionType || 'Recon';
    document.getElementById('missionAo').value = meta.ao || currentMission.ao || '';
    document.getElementById('missionUnit').value = meta.unitOrDetachment || currentMission.unitOrDetachment || '';
    document.getElementById('missionBanner').value = meta.classificationBanner || currentMission.classificationBanner || '';
    document.getElementById('missionTime').value = currentMission.constraints.timeWindow || '';
    document.getElementById('missionCreator').value = meta.createdBy || currentMission.createdBy || '';
    document.getElementById('missionDate').value = meta.createdOn || currentMission.createdOn || '';
    document.getElementById('missionDuration').value = meta.durationHours || 0;
    document.getElementById('missionAltitude').value = meta.altitudeBand || 'Surface';
    document.getElementById('missionTemperature').value = meta.temperatureBand || 'Temperate';
  }

  function renderPhases() {
    const container = document.getElementById('phasesContainer');
    container.innerHTML = '';
    currentMission.phases.forEach((phase, idx) => {
      const card = document.createElement('div');
      card.className = 'phase-card';
      card.innerHTML = `
        <header>
          <div>
            <input type="text" value="${phase.name}" data-phase="${phase.id}" class="phase-name" />
            <div class="summary">${phase.tasks?.length || 0} tasks • ${phase.assetsUsed?.length || 0} assets</div>
          </div>
          <div class="phase-order">
            <button class="secondary-btn" data-move="up" data-idx="${idx}">↑</button>
            <button class="secondary-btn" data-move="down" data-idx="${idx}">↓</button>
            <button class="danger-btn" data-delete="${phase.id}">✕</button>
          </div>
        </header>
        <label>Description<textarea data-field="description" data-id="${phase.id}">${phase.description || ''}</textarea></label>
        <div class="grid two-col">
          <label>Start Condition<input data-field="startCondition" data-id="${phase.id}" value="${phase.startCondition || ''}" /></label>
          <label>End Condition<input data-field="endCondition" data-id="${phase.id}" value="${phase.endCondition || ''}" /></label>
        </div>
        <div class="tasks">
          <label>Tasks (one per line)
            <textarea data-field="tasks" data-id="${phase.id}">${(phase.tasks || []).join('\n')}</textarea>
          </label>
        </div>
        <label>EMCON Considerations<textarea data-field="emconConsiderations" data-id="${phase.id}">${phase.emconConsiderations || ''}</textarea></label>
        <div class="assets-used">
          <label>Assets Used
            <select multiple data-field="assetsUsed" data-id="${phase.id}">
              ${currentMission.assets
                .map((a) => `<option value="${a.id}" ${phase.assetsUsed?.includes(a.id) ? 'selected' : ''}>${a.name} (${a.roleTags?.join(', ') || ''})</option>`)
                .join('')}
            </select>
          </label>
        </div>
      `;
      container.appendChild(card);
    });
    // Bind events
    container.querySelectorAll('.phase-name').forEach((inp) => inp.addEventListener('input', onPhaseNameChange));
    container.querySelectorAll('textarea, input, select').forEach((el) => el.addEventListener('input', onPhaseFieldChange));
    container.querySelectorAll('[data-move]').forEach((btn) => btn.addEventListener('click', onPhaseMove));
    container.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', onPhaseDelete));
  }

  function renderAssets() {
    const wrapper = document.getElementById('assetTable');
    if (!currentMission.assets.length) {
      wrapper.innerHTML = '<p class="muted">No assets added yet.</p>';
      return;
    }
    const rows = currentMission.assets
      .map(
        (a) => `
        <tr>
          <td>${a.name}</td>
          <td>${a.type}</td>
          <td>${(a.roleTags || []).join(', ')}</td>
          <td>${a.ownerElement || ''}</td>
          <td>${a.sourceTool || ''}</td>
          <td>${a.critical ? 'Critical' : ''}</td>
          <td>${a.notes || ''}</td>
          <td class="asset-actions">
            <button class="secondary-btn" data-edit="${a.id}">Edit</button>
            <button class="secondary-btn" data-dup="${a.id}">Duplicate</button>
            <button class="danger-btn" data-remove="${a.id}">Delete</button>
          </td>
        </tr>`
      )
      .join('');
    wrapper.innerHTML = `<table><thead><tr><th>Name</th><th>Type</th><th>Role Tags</th><th>Owner/Element</th><th>Source Tool</th><th>Critical</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
    wrapper.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => removeAsset(btn.dataset.remove)));
    wrapper.querySelectorAll('[data-dup]').forEach((btn) => btn.addEventListener('click', () => duplicateAsset(btn.dataset.dup)));
    wrapper.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => editAsset(btn.dataset.edit)));
  }

  function renderAssignments() {
    const container = document.getElementById('roleAssignment');
    if (!container) return;
    if (!currentMission.assignments?.length) {
      container.innerHTML = '<p class="muted">No role assignments yet.</p>';
    } else {
      const rows = currentMission.assignments
        .map((a) => {
          return `
            <tr>
              <td>
                <select data-assign-field="assetId" data-id="${a.id}">
                  ${currentMission.assets
                    .map(
                      (asset) => `<option value="${asset.id}" ${asset.id === a.assetId ? 'selected' : ''}>${asset.name}</option>`
                    )
                    .join('')}
                </select>
              </td>
              <td>
                <select data-assign-field="phaseId" data-id="${a.id}">
                  ${currentMission.phases
                    .map((p) => `<option value="${p.id}" ${p.id === a.phaseId ? 'selected' : ''}>${p.name}</option>`)
                    .join('')}
                </select>
              </td>
              <td><input data-assign-field="role" data-id="${a.id}" value="${a.role || ''}" placeholder="Role" /></td>
              <td><input data-assign-field="notes" data-id="${a.id}" value="${a.notes || ''}" placeholder="Employment notes" /></td>
              <td class="center"><input type="checkbox" data-assign-field="critical" data-id="${a.id}" ${a.critical ? 'checked' : ''}></td>
              <td class="center"><input type="checkbox" data-assign-field="requiresComms" data-id="${a.id}" ${
                a.requiresComms ? 'checked' : ''
              }></td>
              <td><button class="danger-btn" data-remove-assignment="${a.id}">✕</button></td>
            </tr>`;
        })
        .join('');
      container.innerHTML = `<table><thead><tr><th>Asset</th><th>Phase</th><th>Role</th><th>Notes</th><th>Critical</th><th>Needs Comms</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    container.querySelectorAll('[data-assign-field]').forEach((el) => {
      el.addEventListener('input', onAssignmentFieldChange);
      el.addEventListener('change', onAssignmentFieldChange);
    });
    container.querySelectorAll('[data-remove-assignment]').forEach((btn) => btn.addEventListener('click', onAssignmentRemove));
  }

  function renderAssignmentMatrix() {
    const matrix = document.getElementById('assignmentMatrix');
    if (!currentMission.assets.length || !currentMission.phases.length) {
      matrix.innerHTML = '<p class="muted">Add assets and phases to see assignments.</p>';
      return;
    }
    let header = '<tr><th>Asset</th>' + currentMission.phases.map((p) => `<th>${p.name}</th>`).join('') + '</tr>';
    let body = currentMission.assets
      .map((asset) => {
        const cells = currentMission.phases
          .map((p) => {
            const checked = p.assetsUsed?.includes(asset.id) ? 'checked' : '';
            return `<td><input type="checkbox" data-assign-asset="${asset.id}" data-phase="${p.id}" ${checked}></td>`;
          })
          .join('');
        return `<tr><td>${asset.name}</td>${cells}</tr>`;
      })
      .join('');
    matrix.innerHTML = `<table>${header}${body}</table>`;
    matrix.querySelectorAll('input[type="checkbox"]').forEach((cb) => cb.addEventListener('change', onAssignmentChange));
  }

  function renderConstraints() {
    document.getElementById('constraintTime').value = currentMission.constraints.timeWindow || '';
    document.getElementById('constraintEnvironment').value = currentMission.constraints.environment || '';
    document.getElementById('constraintRf').value = currentMission.constraints.rfConstraints || '';
    document.getElementById('constraintLogistics').value = currentMission.constraints.logisticsConstraints || '';
    document.getElementById('constraintRisk').value = currentMission.constraints.riskNotes || '';

    const list = document.getElementById('successCriteriaList');
    list.innerHTML = '';
    (currentMission.constraints.successCriteria || []).forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<input data-criterion="${idx}" value="${item}"><button class="danger-btn" data-remove-criterion="${idx}">✕</button>`;
      list.appendChild(row);
    });
    const addRow = document.createElement('div');
    addRow.className = 'row';
    addRow.innerHTML = `<input id="newCriterion" placeholder="Add success criterion"><button class="primary-btn" id="addCriterionBtn">Add</button>`;
    list.appendChild(addRow);

    list.querySelectorAll('input[data-criterion]').forEach((inp) => inp.addEventListener('input', onCriterionChange));
    list.querySelectorAll('[data-remove-criterion]').forEach((btn) => btn.addEventListener('click', onCriterionRemove));
    document.getElementById('addCriterionBtn').addEventListener('click', onCriterionAdd);
  }

  function renderBrief() {
    const brief = document.getElementById('missionBrief');
    const m = currentMission;
    const meta = m.missionMeta || {};
    const assetsById = Object.fromEntries(m.assets.map((a) => [a.id, a]));
    const phaseBlocks = m.phases
      .map((p) => {
        const assetText = (p.assetsUsed || []).map((id) => assetsById[id]?.name || 'Unknown').join(', ');
        return `
          <div class="phase-block">
            <h3>${p.name}</h3>
            <p>${p.description || ''}</p>
            <strong>Tasks:</strong>
            <ul>${(p.tasks || []).map((t) => `<li>${t}</li>`).join('')}</ul>
            <p><strong>Assets:</strong> ${assetText || 'None assigned'}</p>
            <p><strong>EMCON:</strong> ${p.emconConsiderations || 'n/a'}</p>
          </div>`;
      })
      .join('');

    const assetTable = `
      <div class="asset-table">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Role Tags</th><th>Owner</th><th>Phases</th></tr></thead>
          <tbody>
            ${m.assets
              .map((a) => {
                const inPhases = m.phases.filter((p) => p.assetsUsed?.includes(a.id)).map((p) => p.name).join(', ');
                return `<tr><td>${a.name}</td><td>${a.type}</td><td>${(a.roleTags || []).join(', ')}</td><td>${a.ownerElement || ''}</td><td>${inPhases}</td></tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>`;

    const constraints = `
      <ul>
        ${(m.constraints.successCriteria || []).map((s) => `<li>${s}</li>`).join('')}
      </ul>
      <p><strong>RF / EW:</strong> ${m.constraints.rfConstraints || 'n/a'}</p>
      <p><strong>Logistics:</strong> ${m.constraints.logisticsConstraints || 'n/a'}</p>
      <p><strong>Risk:</strong> ${m.constraints.riskNotes || 'n/a'}</p>
    `;

    brief.innerHTML = `
      <div class="classification">${meta.classificationBanner || 'UNCLASSIFIED'}</div>
      <h2>${meta.name || m.name || 'Untitled Mission'}</h2>
      <p><strong>Unit:</strong> ${meta.unitOrDetachment || m.unitOrDetachment || ''} • <strong>AO:</strong> ${
      meta.ao || m.ao || ''
    } • <strong>Time:</strong> ${m.constraints.timeWindow || ''}</p>
      <p><strong>Mission Type:</strong> ${meta.missionType || m.missionType || ''}</p>
      <p><strong>Duration:</strong> ${meta.durationHours || 0} hrs • <strong>Altitude:</strong> ${meta.altitudeBand || 'n/a'} • <strong>Temperature:</strong> ${meta.temperatureBand || 'n/a'}</p>
      <h3>Phased Concept</h3>
      ${phaseBlocks}
      <h3>Assets & Roles</h3>
      ${assetTable}
      <h3>Constraints & Success Criteria</h3>
      ${constraints}
    `;

    const missionJson = JSON.stringify(m, null, 2);
    document.getElementById('atakStub').value = JSON.stringify(buildAtakStub(m), null, 2);
    document.getElementById('copyJsonBtn').onclick = () => copyToClipboard(missionJson);
    document.getElementById('copyAtakBtn').onclick = () => copyToClipboard(document.getElementById('atakStub').value);

    renderMissionCards();
    renderFeasibility();
  }

  function renderMissionCards() {
    const container = document.getElementById('missionCards');
    if (!container) return;
    if (!currentMission.assignments.length) {
      container.innerHTML = '<p class="muted">Add role assignments to generate mission cards.</p>';
      return;
    }
    const phasesById = Object.fromEntries(currentMission.phases.map((p) => [p.id, p]));
    const cards = currentMission.assignments
      .map((a) => {
        const asset = currentMission.assets.find((x) => x.id === a.assetId) || {};
        const phase = phasesById[a.phaseId] || {};
        return `
          <div class="mission-card">
            <div class="card-header">
              <div class="card-title">${asset.name || 'Asset'}</div>
              ${a.critical || asset.critical ? '<span class="pill danger">Critical</span>' : ''}
            </div>
            <div class="card-body">
              <p><strong>Role:</strong> ${a.role || '—'}</p>
              <p><strong>Phase:</strong> ${phase.name || '—'}</p>
              <p><strong>Notes:</strong> ${a.notes || asset.notes || '—'}</p>
              <p><strong>Kit:</strong> ${asset.sourceTool || 'Unknown'}</p>
              ${a.requiresComms ? '<p class="warning">Requires comms redundancy</p>' : ''}
            </div>
          </div>`;
      })
      .join('');
    container.innerHTML = cards;
  }

  function renderFeasibility() {
    const container = document.getElementById('feasibilityPanel');
    if (!container) return;
    const duration = Number(currentMission.missionMeta?.durationHours || 0);
    const criticalPlatforms = currentMission.assets.filter((a) => (a.type === 'PLATFORM' || a.type === 'UXS') && a.critical).length;
    const rows = currentMission.assets
      .filter((a) => a.type === 'PLATFORM' || a.type === 'UXS')
      .map((asset) => {
        const enduranceHrs = getAssetEnduranceHours(asset);
        const sorties = enduranceHrs ? Math.ceil(duration / enduranceHrs) : 'n/a';
        const warning = enduranceHrs && duration > enduranceHrs * 2 ? '⚠️ sustainment needed' : '';
        return `<tr><td>${asset.name}</td><td>${enduranceHrs ? `${enduranceHrs}h` : 'Unknown'}</td><td>${duration || 0}h</td><td>${sorties}</td><td>${warning}</td></tr>`;
      })
      .join('');

    const commsRisk = evaluateCommsRisk();
    const sustainmentFlag = currentMission.assets.some((a) => a.sourceTool === 'KitSmith') ? 'Linked' : 'Sustainment not yet validated';

    container.innerHTML = `
      <div class="feasibility-banner">
        <div><strong>Duration:</strong> ${duration || 0} hrs</div>
        <div><strong>Critical platforms:</strong> ${criticalPlatforms}</div>
        <div class="flag">${sustainmentFlag}</div>
        <div class="flag ${commsRisk ? 'danger' : ''}">${commsRisk ? 'Comms risk detected' : 'Comms acceptable'}</div>
      </div>
      <div class="asset-table">
        <table>
          <thead><tr><th>Platform</th><th>Single-sortie endurance</th><th>Mission duration</th><th>Implied sorties</th><th>Notes</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">No platforms loaded</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  /** Event handlers **/
  function bindEvents() {
    document.getElementById('loadExampleBtn').addEventListener('click', createExampleMission);
    document.getElementById('newMissionBtn').addEventListener('click', createNewMission);
    document.getElementById('saveMissionBtn').addEventListener('click', saveCurrentMission);
    document.getElementById('deleteMissionBtn').addEventListener('click', deleteCurrentMission);
    document.getElementById('loadMissionBtn').addEventListener('click', toggleSavedList);
    document.getElementById('addPhaseBtn').addEventListener('click', addPhase);
    document.getElementById('addAssetBtn').addEventListener('click', addAssetPrompt);
    document.getElementById('seedAssetsBtn').addEventListener('click', seedAssets);
    document.getElementById('addAssignmentBtn').addEventListener('click', addAssignment);
    document.getElementById('importNodeBtn').addEventListener('click', () => triggerImport('node'));
    document.getElementById('importPlatformBtn').addEventListener('click', () => triggerImport('platform'));
    document.getElementById('importMeshBtn').addEventListener('click', () => triggerImport('mesh'));
    document.getElementById('exportOverlayBtn').addEventListener('click', downloadMissionOverlay);
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadMissionJson);

    document.getElementById('missionName').addEventListener('input', (e) => updateMetaField('name', e.target.value));
    document.getElementById('missionType').addEventListener('input', (e) => updateMetaField('missionType', e.target.value));
    document.getElementById('missionAo').addEventListener('input', (e) => updateMetaField('ao', e.target.value));
    document.getElementById('missionUnit').addEventListener('input', (e) => updateMetaField('unitOrDetachment', e.target.value));
    document.getElementById('missionBanner').addEventListener('input', (e) => updateMetaField('classificationBanner', e.target.value));
    document.getElementById('missionTime').addEventListener('input', (e) => updateConstraint('timeWindow', e.target.value));
    document.getElementById('missionCreator').addEventListener('input', (e) => updateMetaField('createdBy', e.target.value));
    document.getElementById('missionDate').addEventListener('input', (e) => updateMetaField('createdOn', e.target.value));
    document.getElementById('missionDuration').addEventListener('input', (e) => updateMetaField('durationHours', Number(e.target.value)));
    document.querySelectorAll('[data-duration]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const hours = Number(btn.dataset.duration);
        document.getElementById('missionDuration').value = hours;
        updateMetaField('durationHours', hours);
      })
    );
    document.getElementById('missionAltitude').addEventListener('input', (e) => updateMetaField('altitudeBand', e.target.value));
    document.getElementById('missionTemperature').addEventListener('input', (e) =>
      updateMetaField('temperatureBand', e.target.value)
    );

    document.getElementById('constraintTime').addEventListener('input', (e) => updateConstraint('timeWindow', e.target.value));
    document.getElementById('constraintEnvironment').addEventListener('input', (e) => updateConstraint('environment', e.target.value));
    document.getElementById('constraintRf').addEventListener('input', (e) => updateConstraint('rfConstraints', e.target.value));
    document.getElementById('constraintLogistics').addEventListener('input', (e) => updateConstraint('logisticsConstraints', e.target.value));
    document.getElementById('constraintRisk').addEventListener('input', (e) => updateConstraint('riskNotes', e.target.value));

    document.querySelectorAll('.parse-btn').forEach((btn) => btn.addEventListener('click', onParseClick));
  }

  function onPhaseNameChange(e) {
    const id = e.target.dataset.phase;
    const phase = currentMission.phases.find((p) => p.id === id);
    if (phase) {
      phase.name = e.target.value;
      renderPhases();
      renderBrief();
      renderAssignmentMatrix();
    }
  }

  function onPhaseFieldChange(e) {
    const id = e.target.dataset.id;
    const field = e.target.dataset.field;
    const phase = currentMission.phases.find((p) => p.id === id);
    if (!phase) return;
    if (field === 'tasks') {
      phase.tasks = e.target.value.split('\n').filter(Boolean);
    } else if (field === 'assetsUsed') {
      const options = Array.from(e.target.selectedOptions).map((o) => o.value);
      phase.assetsUsed = options;
    } else {
      phase[field] = e.target.value;
    }
    renderBrief();
    renderAssignmentMatrix();
  }

  function onPhaseMove(e) {
    const idx = Number(e.target.dataset.idx);
    const dir = e.target.dataset.move === 'up' ? -1 : 1;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= currentMission.phases.length) return;
    const [moved] = currentMission.phases.splice(idx, 1);
    currentMission.phases.splice(newIdx, 0, moved);
    renderPhases();
    renderAssignmentMatrix();
  }

  function onPhaseDelete(e) {
    const id = e.target.dataset.delete;
    currentMission.phases = currentMission.phases.filter((p) => p.id !== id);
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
  }

  function addPhase() {
    currentMission.phases.push({
      id: uuid(),
      name: 'New Phase',
      description: '',
      tasks: [],
      assetsUsed: []
    });
    renderPhases();
    renderAssignmentMatrix();
  }

  function addAssetPrompt() {
    const name = prompt('Asset name?');
    if (!name) return;
    const type = prompt('Type (NODE/UXS/MESH_ELEMENT/KIT/OTHER)?', 'OTHER') || 'OTHER';
    const sourceTool = prompt('Source tool?', 'Manual');
    const roleTags = (prompt('Role tags (comma separated)?', '') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const ownerElement = prompt('Owner/Element?', '');
    const notes = prompt('Notes?', '');
    currentMission.assets.push({ id: uuid(), name, type, sourceTool, roleTags, ownerElement, notes, critical: false });
    renderAssets();
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
  }

  function seedAssets() {
    currentMission.assets.push(...getDemoAssets());
    renderAssets();
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
  }

  function removeAsset(id) {
    currentMission.assets = currentMission.assets.filter((a) => a.id !== id);
    currentMission.phases.forEach((p) => (p.assetsUsed = (p.assetsUsed || []).filter((aid) => aid !== id)));
    renderAssets();
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
  }

  function duplicateAsset(id) {
    const asset = currentMission.assets.find((a) => a.id === id);
    if (!asset) return;
    const copy = { ...asset, id: uuid(), name: `${asset.name} (copy)` };
    currentMission.assets.push(copy);
    renderAssets();
    renderAssignmentMatrix();
    renderPhases();
  }

  function editAsset(id) {
    const asset = currentMission.assets.find((a) => a.id === id);
    if (!asset) return;
    const name = prompt('Asset name?', asset.name) || asset.name;
    const type = prompt('Type?', asset.type) || asset.type;
    const sourceTool = prompt('Source tool?', asset.sourceTool || 'Manual') || asset.sourceTool;
    const roleTags = (prompt('Role tags comma separated?', (asset.roleTags || []).join(',')) || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const ownerElement = prompt('Owner/Element?', asset.ownerElement || '') || asset.ownerElement;
    const notes = prompt('Notes?', asset.notes || '') || asset.notes;
    const critical = confirm('Mark as critical to mission success?');
    Object.assign(asset, { name, type, sourceTool, roleTags, ownerElement, notes, critical });
    renderAssets();
    renderAssignmentMatrix();
    renderPhases();
    renderBrief();
  }

  function addAssignment() {
    if (!currentMission.assets.length || !currentMission.phases.length) {
      alert('Add assets and phases before assigning roles.');
      return;
    }
    currentMission.assignments.push({
      id: uuid(),
      assetId: currentMission.assets[0].id,
      phaseId: currentMission.phases[0].id,
      role: '',
      notes: '',
      critical: false,
      requiresComms: false
    });
    renderAssignments();
    renderMissionCards();
  }

  function onAssignmentFieldChange(e) {
    const id = e.target.dataset.id;
    const field = e.target.dataset.assignField;
    const assignment = currentMission.assignments.find((a) => a.id === id);
    if (!assignment) return;
    if (e.target.type === 'checkbox') assignment[field] = e.target.checked;
    else assignment[field] = e.target.value;
    renderMissionCards();
    renderFeasibility();
  }

  function onAssignmentRemove(e) {
    const id = e.target.dataset.removeAssignment;
    currentMission.assignments = currentMission.assignments.filter((a) => a.id !== id);
    renderAssignments();
    renderMissionCards();
  }

  function onAssignmentChange(e) {
    const assetId = e.target.dataset.assignAsset;
    const phaseId = e.target.dataset.phase;
    const phase = currentMission.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    if (!phase.assetsUsed) phase.assetsUsed = [];
    if (e.target.checked) {
      if (!phase.assetsUsed.includes(assetId)) phase.assetsUsed.push(assetId);
    } else {
      phase.assetsUsed = phase.assetsUsed.filter((id) => id !== assetId);
    }
    renderPhases();
    renderBrief();
  }

  function onCriterionChange(e) {
    const idx = Number(e.target.dataset.criterion);
    currentMission.constraints.successCriteria[idx] = e.target.value;
    renderBrief();
  }
  function onCriterionRemove(e) {
    const idx = Number(e.target.dataset.removeCriterion);
    currentMission.constraints.successCriteria.splice(idx, 1);
    renderConstraints();
    renderBrief();
  }
  function onCriterionAdd() {
    const value = document.getElementById('newCriterion').value.trim();
    if (!value) return;
    currentMission.constraints.successCriteria.push(value);
    renderConstraints();
    renderBrief();
  }

  function updateMissionField(field, value) {
    currentMission[field] = value;
    renderBrief();
  }

  function updateMetaField(field, value) {
    if (!currentMission.missionMeta) currentMission.missionMeta = {};
    currentMission.missionMeta[field] = value;
    if (['name', 'missionType', 'ao', 'unitOrDetachment', 'classificationBanner', 'createdBy', 'createdOn'].includes(field)) {
      currentMission[field] = value;
    }
    renderBrief();
    renderFeasibility();
  }
  function updateConstraint(field, value) {
    currentMission.constraints[field] = value;
    renderBrief();
  }

  function onParseClick(e) {
    const type = e.target.dataset.parse;
    const textarea = document.getElementById(`${type}Json`);
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;
    try {
      const data = JSON.parse(text);
      let parsed = [];
      if (type === 'node') parsed = parseNodeArchitectJson(data);
      if (type === 'uxs') parsed = parseUxSArchitectJson(data);
      if (type === 'mesh') parsed = parseMeshArchitectJson(data);
      if (type === 'kit') parsed = parseKitSmithJson(data);
      parsed.forEach((asset) => currentMission.assets.push(asset));
      renderAssets();
      renderPhases();
      renderAssignmentMatrix();
      renderBrief();
      alert(`Added ${parsed.length} assets`);
    } catch (err) {
      alert('Invalid JSON');
    }
  }

  function triggerImport(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (type === 'node') addImportedNodes(data);
          if (type === 'platform') addImportedPlatforms(data);
          if (type === 'mesh') addImportedMesh(data);
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function addImportedNodes(data) {
    const parsed = parseNodeArchitectJson(data);
    currentMission.imports.nodes = parsed;
    currentMission.assets.push(
      ...parsed.map((node) => ({
        ...node,
        type: 'NODE',
        critical: Boolean(node.critical)
      }))
    );
    renderAssets();
    renderAssignmentMatrix();
    renderBrief();
    alert(`Imported ${parsed.length} node designs`);
  }

  function addImportedPlatforms(data) {
    const parsed = parsePlatformArchitectJson(data);
    currentMission.imports.platforms = parsed;
    currentMission.assets.push(
      ...parsed.map((platform) => ({
        ...platform,
        type: 'PLATFORM',
        critical: Boolean(platform.critical)
      }))
    );
    renderAssets();
    renderAssignmentMatrix();
    renderFeasibility();
    renderBrief();
    alert(`Imported ${parsed.length} platform designs`);
  }

  function addImportedMesh(data) {
    currentMission.imports.mesh = data;
    renderFeasibility();
    alert('Mesh data imported');
  }

  /** Storage **/
  function saveCurrentMission() {
    const idx = findMissionIndex(currentMission.id);
    if (idx >= 0) missions[idx] = currentMission;
    else missions.push(currentMission);
    saveToStorage();
    renderSavedMissions();
    alert('Mission saved locally');
  }

  function deleteCurrentMission() {
    if (!confirm('Delete this mission from local storage?')) return;
    missions = missions.filter((m) => m.id !== currentMission.id);
    saveToStorage();
    createNewMission();
    renderSavedMissions();
  }

  function renderSavedMissions() {
    const list = document.getElementById('savedMissionsList');
    list.innerHTML = '';
    missions.forEach((m) => {
      const btn = document.createElement('button');
      btn.textContent = `${m.name || 'Untitled'} (${m.createdOn})`;
      btn.addEventListener('click', () => loadMissionById(m.id));
      list.appendChild(btn);
    });
  }

  function toggleSavedList() {
    const list = document.getElementById('savedMissionsList');
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
  }

  function loadMissionById(id) {
    const m = missions.find((x) => x.id === id);
    if (!m) return;
    currentMission = JSON.parse(JSON.stringify(m));
    renderAll();
    toggleSavedList();
  }

  /** Export helpers **/
  function downloadMissionJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentMission, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `${currentMission.name || 'mission'}.json`);
    a.click();
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
  }

  function buildAtakStub(m) {
    return {
      ceradonMissionVersion: '1.0',
      missionMeta: {
        id: m.id,
        name: m.missionMeta?.name || m.name,
        classificationBanner: m.missionMeta?.classificationBanner || m.classificationBanner,
        ao: m.missionMeta?.ao || m.ao,
        unit: m.missionMeta?.unitOrDetachment || m.unitOrDetachment,
        time: m.constraints.timeWindow,
        createdBy: m.missionMeta?.createdBy || m.createdBy,
        createdOn: m.missionMeta?.createdOn || m.createdOn,
        missionType: m.missionMeta?.missionType || m.missionType,
        durationHours: m.missionMeta?.durationHours,
        altitudeBand: m.missionMeta?.altitudeBand,
        temperatureBand: m.missionMeta?.temperatureBand
      },
      phases: m.phases.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        startCondition: p.startCondition,
        endCondition: p.endCondition,
        tasks: p.tasks,
        assets: p.assetsUsed,
        emcon: p.emconConsiderations
      })),
      assets: m.assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        sourceTool: a.sourceTool,
        roleTags: a.roleTags,
        ownerElement: a.ownerElement,
        notes: a.notes
      })),
      assignments: m.assignments || []
    };
  }

  /** Integration stub parsers **/
  function parseNodeArchitectJson(data) {
    return normalizeIncomingAssets(data, 'NodeArchitect', 'NODE');
  }
  function parseUxSArchitectJson(data) {
    return normalizeIncomingAssets(data, 'UxSArchitect', 'UXS');
  }
  function parsePlatformArchitectJson(data) {
    return normalizeIncomingAssets(data, 'PlatformArchitect', 'PLATFORM');
  }
  function parseMeshArchitectJson(data) {
    return normalizeIncomingAssets(data, 'MeshArchitect', 'MESH_ELEMENT');
  }
  function parseKitSmithJson(data) {
    return normalizeIncomingAssets(data, 'KitSmith', 'KIT');
  }

  function normalizeIncomingAssets(data, sourceTool, defaultType) {
    if (!Array.isArray(data)) return [];
    return data.map((item) => ({
      id: uuid(),
      name: item.name || item.id || `${sourceTool} asset`,
      type: defaultType,
      sourceTool,
      sourceId: item.id,
      roleTags: item.roleTags || [],
      ownerElement: item.owner || '',
      notes: item.notes || '',
      enduranceHours: item.enduranceHours || item.endurance || null,
      enduranceMinutes: item.enduranceMinutes || null,
      lat: item.lat || item.latitude,
      lon: item.lon || item.lng || item.longitude,
      critical: Boolean(item.critical)
    }));
  }

  function getAssetEnduranceHours(asset) {
    if (asset.enduranceHours) return Number(asset.enduranceHours);
    if (asset.enduranceMinutes) return Number(asset.enduranceMinutes) / 60;
    return null;
  }

  function downloadMissionOverlay() {
    const features = [];
    currentMission.assets.forEach((asset) => {
      if (asset.lat && asset.lon) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(asset.lon), Number(asset.lat)] },
          properties: { name: asset.name, role: asset.roleTags?.join(', '), type: asset.type }
        });
      }
    });
    if (!features.length) {
      alert('No asset coordinates available to export.');
      return;
    }
    const geojson = { type: 'FeatureCollection', features };
    const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `${currentMission.missionMeta?.name || 'mission'}-overlay.geojson`);
    a.click();
  }

  function evaluateCommsRisk() {
    const mesh = currentMission.imports?.mesh;
    if (!mesh || !Array.isArray(mesh.links)) return false;
    const marginalLinks = mesh.links.filter((l) => /marginal|unlikely/i.test(l.quality || ''));
    const nodes = new Set();
    mesh.links.forEach((l) => {
      if (l.from) nodes.add(l.from);
      if (l.to) nodes.add(l.to);
    });
    const degree = {};
    mesh.links.forEach((l) => {
      degree[l.from] = (degree[l.from] || 0) + 1;
      degree[l.to] = (degree[l.to] || 0) + 1;
    });
    const singlePoints = Object.values(degree).filter((d) => d === 1).length;
    const commsAssignments = currentMission.assignments.filter((a) => a.requiresComms || a.critical);
    return commsAssignments.length > 0 && (marginalLinks.length === mesh.links.length || singlePoints > 0);
  }

  /** Init **/
  function init() {
    missions = loadFromStorage();
    currentMission = missions[missions.length - 1] ? hydrateMission(JSON.parse(JSON.stringify(missions[missions.length - 1]))) : null;
    if (!currentMission) createNewMission();
    renderAll();
    bindEvents();
  }

  function hydrateMission(m) {
    if (!m.missionMeta) {
      m.missionMeta = {
        name: m.name || '',
        classificationBanner: m.classificationBanner || 'UNCLASSIFIED',
        ao: m.ao || '',
        unitOrDetachment: m.unitOrDetachment || '',
        createdOn: m.createdOn || new Date().toISOString().split('T')[0],
        createdBy: m.createdBy || '',
        missionType: m.missionType || 'Recon',
        durationHours: 0,
        altitudeBand: 'Surface',
        temperatureBand: 'Temperate'
      };
    }
    if (!m.assignments) m.assignments = [];
    if (!m.imports) m.imports = { nodes: [], platforms: [], mesh: null };
    return m;
  }

  document.addEventListener('DOMContentLoaded', init);
})();

// Ceradon Mission Architect - vanilla JS SPA
(function () {
  let project = null;
  let currentMission = null;
  let bannerTimeout = null;

  const altitudeBands = ['Surface', 'Low', 'Medium', 'High', 'Stratospheric'];
  const temperatureBands = ['Cold', 'Temperate', 'Hot', 'Extreme'];
  const missionElements = ['Core Team', 'Partner Element', 'ISR Cell', 'Sustainment / Mesh Support'];

  const defaultPhases = [
    { id: 'STAGE', name: 'Staging', description: 'Assemble, validate comms, and brief', tasks: [], assetsUsed: [] },
    { id: 'INFIL', name: 'Infil', description: 'Move to area and establish coverage', tasks: [], assetsUsed: [] },
    { id: 'ON_STATION', name: 'On-Station', description: 'Operate on target tasks', tasks: [], assetsUsed: [] },
    { id: 'EXFIL', name: 'Exfil', description: 'Recover and depart', tasks: [], assetsUsed: [] }
  ];

  function showBanner(message, tone = 'info') {
    const banner = document.getElementById('statusBanner');
    if (!banner) return;
    banner.textContent = message;
    banner.className = `status-banner ${tone}`;
    banner.style.display = 'block';
    if (bannerTimeout) clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      banner.style.display = 'none';
    }, 5000);
  }

  /** Utility **/
  const uuid = () => 'id-' + Math.random().toString(36).substring(2, 9);
  const findMissionIndex = (id) => (project.meta.savedMissions || []).findIndex((m) => m.id === id);

  function ensureProject() {
    if (!project) project = normalizeMissionProject(loadMissionProject());
    if (!project.meta) project.meta = {};
    if (!project.meta.savedMissions) project.meta.savedMissions = [];
    if (!project.environment) project.environment = { altitudeBand: 'Surface', temperatureBand: 'Temperate' };
    if (!project.constraints) project.constraints = [];
    if (!project.mission) project.mission = createEmptyMissionProject().mission;
    currentMission = hydrateMission(project.mission);
    project.mission = currentMission;
    alignMissionMetaWithProject();
    hydrateAssetsFromProject();
    applyProjectEnvelope();
  }

  function syncMetaFromMission() {
    if (!project.meta) project.meta = {};
    const meta = currentMission.missionMeta || {};
    project.meta = {
      ...project.meta,
      name: meta.name || currentMission.name || '',
      durationHours: meta.durationHours || 0,
      altitudeBand: meta.altitudeBand || 'Surface',
      temperatureBand: meta.temperatureBand || 'Temperate',
      savedMissions: project.meta.savedMissions || [],
      lastUpdated: new Date().toISOString(),
      origin_tool: 'mission'
    };
    project.environment = {
      ...project.environment,
      ao: meta.ao || currentMission.ao || project.environment?.ao || '',
      altitudeBand: meta.altitudeBand || project.environment?.altitudeBand || 'Surface',
      temperatureBand: meta.temperatureBand || project.environment?.temperatureBand || 'Temperate',
      weather: currentMission.constraints.environment || project.environment?.weather || '',
      logisticsNotes: currentMission.constraints.logisticsConstraints || project.environment?.logisticsNotes || ''
    };
    project.constraints = buildConstraintArrayFromMission();
  }

  function alignMissionMetaWithProject() {
    if (!project?.meta || !currentMission?.missionMeta) return;
    currentMission.missionMeta = {
      ...currentMission.missionMeta,
      name: currentMission.missionMeta.name || project.meta.name || '',
      durationHours: currentMission.missionMeta.durationHours || project.meta.durationHours || 0,
      altitudeBand: currentMission.missionMeta.altitudeBand || project.meta.altitudeBand || 'Surface',
      temperatureBand: currentMission.missionMeta.temperatureBand || project.meta.temperatureBand || 'Temperate',
      ao: currentMission.missionMeta.ao || project.environment?.ao || '',
      unitOrDetachment: currentMission.missionMeta.unitOrDetachment || ''
    };
    if (!currentMission.constraints) currentMission.constraints = {};
    if (!currentMission.constraints.timeWindow && project.meta.durationHours)
      currentMission.constraints.timeWindow = `${project.meta.durationHours} hr window`;
  }

  function persistProject() {
    syncMetaFromMission();
    project.mission = currentMission;
    saveMissionProject(project);
  }

  function applyProjectEnvelope() {
    if (!project || !currentMission) return;
    const env = project.environment || {};
    currentMission.missionMeta = {
      ...currentMission.missionMeta,
      ao: currentMission.missionMeta.ao || env.ao || '',
      altitudeBand: currentMission.missionMeta.altitudeBand || env.altitudeBand || 'Surface',
      temperatureBand: currentMission.missionMeta.temperatureBand || env.temperatureBand || 'Temperate'
    };
    if (!currentMission.constraints.environment && env.weather) currentMission.constraints.environment = env.weather;
    if (!currentMission.constraints.logisticsConstraints && env.logisticsNotes)
      currentMission.constraints.logisticsConstraints = env.logisticsNotes;
    if (Array.isArray(project.constraints) && project.constraints.length) mergeConstraintsIntoMission(project.constraints);
  }

  function buildConstraintArrayFromMission(targetMission = currentMission) {
    const constraintMap = [
      { key: 'timeWindow', label: 'time' },
      { key: 'environment', label: 'environment' },
      { key: 'rfConstraints', label: 'rf' },
      { key: 'logisticsConstraints', label: 'logistics' },
      { key: 'maxSorties', label: 'max-sorties' },
      { key: 'minBatteryReserve', label: 'battery-reserve' },
      { key: 'requireRfCoverage', label: 'rf-coverage' },
      { key: 'riskNotes', label: 'risk' }
    ];
    const items = constraintMap
      .map((entry) => {
        const value = targetMission?.constraints?.[entry.key];
        const include = typeof value === 'boolean' ? value : value !== undefined && value !== null && value !== '';
        if (!include) return null;
        const existing = (project?.constraints || []).find((c) => c.type === entry.label && c.description === value);
        return {
          id: existing?.id || `${entry.label}-${Math.random().toString(36).slice(2, 6)}`,
          type: entry.label,
          description: typeof value === 'boolean' ? (value ? 'Required' : 'Not required') : value,
          severity: /risk|rf/i.test(entry.label) ? 'caution' : 'info'
        };
      })
      .filter(Boolean);
    const success = (targetMission?.constraints?.successCriteria || []).map((desc) => {
      const existing = (project?.constraints || []).find((c) => c.type === 'success-criteria' && c.description === desc);
      return {
        id: existing?.id || `success-${Math.random().toString(36).slice(2, 6)}`,
        type: 'success-criteria',
        description: desc,
        severity: 'info'
      };
    });
    return [...items, ...success];
  }

  function mergeConstraintsIntoMission(list) {
    if (!Array.isArray(list)) return;
    const envNotes = list.find((c) => c.type === 'environment');
    if (envNotes && !currentMission.constraints.environment) currentMission.constraints.environment = envNotes.description;
    const rfNotes = list.find((c) => c.type === 'rf');
    if (rfNotes && !currentMission.constraints.rfConstraints) currentMission.constraints.rfConstraints = rfNotes.description;
    const logistics = list.find((c) => c.type === 'logistics');
    if (logistics && !currentMission.constraints.logisticsConstraints)
      currentMission.constraints.logisticsConstraints = logistics.description;
    const sorties = list.find((c) => c.type === 'max-sorties');
    if (sorties && !currentMission.constraints.maxSorties) currentMission.constraints.maxSorties = Number(sorties.description) || null;
    const reserve = list.find((c) => c.type === 'battery-reserve');
    if (reserve && !currentMission.constraints.minBatteryReserve)
      currentMission.constraints.minBatteryReserve = Number(reserve.description) || null;
    const rfRedundant = list.find((c) => c.type === 'rf-coverage');
    if (rfRedundant && currentMission.constraints.requireRfCoverage === false)
      currentMission.constraints.requireRfCoverage = /require/i.test(rfRedundant.description || '');
  }

  function createNewMission() {
    const empty = createEmptyMissionProject();
    currentMission = hydrateMission({
      ...empty.mission,
      id: uuid(),
      phases: JSON.parse(JSON.stringify(defaultPhases))
    });
    project = normalizeMissionProject({ ...project, mission: currentMission });
    renderAll();
    persistProject();
  }

  function createExampleMission() {
    const today = new Date().toISOString().split('T')[0];
    const demo = buildNeutralDemoScenario(today);
    currentMission = hydrateMission(demo.mission);
    project = normalizeMissionProject({
      ...project,
      mission: currentMission,
      nodes: demo.nodes,
      platforms: demo.platforms,
      kits: demo.kits,
      mesh_links: demo.mesh_links,
      environment: demo.environment,
      constraints: demo.constraints
    });
    currentMission.imports = {
      nodes: project.nodes,
      platforms: project.platforms,
      mesh: { links: project.mesh_links },
      kits: project.kits
    };
    hydrateAssetsFromProject();
    renderAll();
    persistProject();
    showBanner('Loaded demo mission with generic elements.', 'info');
  }

  function getDemoAssets() {
    return buildNeutralDemoAssets();
  }

  function buildNeutralDemoAssets() {
    return [
      {
        id: uuid(),
        name: 'Recon element quadrotor',
        type: 'UXS',
        sourceTool: 'UxSArchitect',
        roleTags: ['recon', 'overwatch'],
        ownerElement: 'Recon element',
        notes: 'Lightweight quadrotor for route scanning.',
        enduranceMinutes: 32,
        rfBand: '2.4GHz',
        batteryWh: 90,
        powerDrawWatts: 150,
        lat: 35.0,
        lon: -106.0,
        elevation: 1600
      },
      {
        id: uuid(),
        name: 'Mesh relay asset',
        type: 'MESH_ELEMENT',
        sourceTool: 'MeshArchitect',
        roleTags: ['relay', 'backbone'],
        ownerElement: 'Support element',
        notes: 'Portable mast with rechargeable pack.',
        rfBand: '900MHz',
        batteryWh: 120,
        powerDrawWatts: 24,
        lat: 35.01,
        lon: -106.02,
        elevation: 1620
      },
      {
        id: uuid(),
        name: 'Ground sensor node',
        type: 'NODE',
        sourceTool: 'NodeArchitect',
        roleTags: ['perimeter', 'mesh-client'],
        ownerElement: 'Recon element',
        notes: 'Passive node providing situational data.',
        rfBand: '5GHz',
        batteryWh: 70,
        powerDrawWatts: 15,
        lat: 35.015,
        lon: -106.025,
        elevation: 1610
      },
      {
        id: uuid(),
        name: 'Support cache kit',
        type: 'KIT',
        sourceTool: 'KitSmith',
        roleTags: ['sustainment'],
        ownerElement: 'Support element',
        notes: 'Battery cache and repair kit.',
        batteryWh: 200,
        powerDrawWatts: 0,
        lat: 35.008,
        lon: -106.01,
        elevation: 1615
      }
    ];
  }

  function buildNeutralDemoScenario(today) {
    const assets = buildNeutralDemoAssets();
    const missionId = `demo-${Math.random().toString(36).slice(2, 7)}`;
    const phases = [
      {
        id: 'STAGE',
        name: 'Staging',
        description: 'Assemble teams, confirm link budget, and prep kits.',
        startCondition: 'All elements on site',
        endCondition: 'Comms checks complete',
        tasks: ['Inventory kits', 'Assign mesh relay location', 'Verify access code entry'],
        assetsUsed: [assets[1].id, assets[3].id],
        emconConsiderations: 'Low power checks only'
      },
      {
        id: 'INFIL',
        name: 'Infil',
        description: 'Move sensors and relay to coverage points.',
        startCondition: 'Teams step off',
        endCondition: 'Relay and node deployed',
        tasks: ['Place ground sensor node', 'Erect relay mast', 'Survey RF paths'],
        assetsUsed: [assets[0].id, assets[1].id, assets[2].id],
        emconConsiderations: 'Directional antennas preferred'
      },
      {
        id: 'ON_STATION',
        name: 'On-Station',
        description: 'Collect data, observe activity, and maintain mesh.',
        startCondition: 'Sensors online',
        endCondition: 'Collection window met',
        tasks: ['Record telemetry for pose research', 'Monitor link quality', 'Rotate batteries as needed'],
        assetsUsed: [assets[0].id, assets[1].id, assets[2].id],
        emconConsiderations: 'Hold video unless required'
      },
      {
        id: 'EXFIL',
        name: 'Exfil',
        description: 'Recover equipment and close out logs.',
        startCondition: 'Mission lead calls ENDEX',
        endCondition: 'All kits recovered',
        tasks: ['Secure collected data', 'Pack relay mast', 'Log sustainment notes'],
        assetsUsed: [assets[0].id, assets[2].id, assets[3].id],
        emconConsiderations: 'Short burst updates only'
      }
    ];

    const constraints = {
      timeWindow: 'H+0 to H+36',
      environment: 'Temperate, light winds',
      rfConstraints: 'Line-of-sight preferred; relay improves valley coverage',
      logisticsConstraints: 'Battery swaps every 4 hrs; keep cache shaded',
      maxSorties: 4,
      minBatteryReserve: 25,
      requireRfCoverage: true,
      successCriteria: ['Maintain mesh with at least two hops', 'Capture telemetry for future pose estimation trials'],
      riskNotes: 'Wind gusts may affect relay mast; secure guy lines'
    };

    const mission = {
      id: missionId,
      missionMeta: {
        name: 'Neutral Demo Mission',
        classificationBanner: 'UNCLASSIFIED // TRAINING USE',
        ao: 'Generic training area',
        unitOrDetachment: 'Demo cell',
        createdOn: today,
        createdBy: 'Mission Architect Demo',
        missionType: 'Recon',
        durationHours: 36,
        altitudeBand: 'Low',
        temperatureBand: 'Temperate'
      },
      phases,
      assets,
      assignments: [],
      imports: {
        nodes: assets.filter((a) => a.type === 'NODE' || a.type === 'MESH_ELEMENT'),
        platforms: assets.filter((a) => a.type === 'UXS'),
        mesh: { links: [] },
        kits: assets.filter((a) => a.type === 'KIT')
      },
      constraints
    };

    const nodes = assets
      .filter((a) => a.type === 'NODE' || a.type === 'MESH_ELEMENT')
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: a.roleTags?.join(', ') || '',
        rf_band: a.rfBand || '',
        power_draw_watts: a.powerDrawWatts || null,
        battery_wh: a.batteryWh || null,
        lat: a.lat,
        lon: a.lon,
        elevation: a.elevation,
        origin_tool: a.type === 'MESH_ELEMENT' ? 'mesh' : 'node'
      }));

    const platforms = assets
      .filter((a) => a.type === 'UXS')
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: a.roleTags?.join(', ') || '',
        rf_band: a.rfBand || '',
        endurance_hours: getAssetEnduranceHours(a) || 0.5,
        battery_wh: a.batteryWh || null,
        power_draw_watts: a.powerDrawWatts || null,
        lat: a.lat,
        lon: a.lon,
        elevation: a.elevation,
        origin_tool: 'uxs'
      }));

    const kits = assets
      .filter((a) => a.type === 'KIT')
      .map((a) => ({
        id: a.id,
        name: a.name,
        contents: a.notes,
        battery_wh: a.batteryWh || null,
        origin_tool: 'kit'
      }));

    const mesh_links = [
      {
        id: `link-${Math.random().toString(36).slice(2, 7)}`,
        from: assets[1].id,
        to: assets[2].id,
        quality: 'Strong',
        rf_band: '900MHz',
        notes: 'Relay to ground node',
        origin_tool: 'mesh'
      },
      {
        id: `link-${Math.random().toString(36).slice(2, 7)}`,
        from: assets[1].id,
        to: assets[0].id,
        quality: 'Moderate',
        rf_band: '900MHz',
        notes: 'Relay to quadrotor control link',
        origin_tool: 'mesh'
      }
    ];

    const environment = {
      ao: mission.missionMeta.ao,
      altitudeBand: mission.missionMeta.altitudeBand,
      temperatureBand: mission.missionMeta.temperatureBand,
      elevationRef: 1600,
      weather: constraints.environment,
      logisticsNotes: constraints.logisticsConstraints
    };

    const constraintArray = buildConstraintArrayFromMission(mission);

    return { mission, nodes, platforms, mesh_links, kits, environment, constraints: constraintArray };
  }

  /** Rendering **/
  function renderAll() {
    if (!currentMission) return;
    renderNav();
    renderSetup();
    renderPhases();
    renderAssets();
    renderAssignments();
    renderPhaseAssetSummary();
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
    window.location.hash = id;
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
      renderPhaseAssetSummary();
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
    renderPhaseAssetSummary();
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
              <td>
                <select data-assign-field="team" data-id="${a.id}">
                  ${missionElements
                    .map((el) => `<option value="${el}" ${el === a.team ? 'selected' : ''}>${el}</option>`)
                    .join('')}
                  ${
                    a.team && !missionElements.includes(a.team)
                      ? `<option value="${a.team}" selected>${a.team}</option>`
                      : ''
                  }
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
      container.innerHTML = `<table><thead><tr><th>Asset</th><th>Phase</th><th>Element</th><th>Role</th><th>Notes</th><th>Critical</th><th>Needs Comms</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
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

  function renderPhaseAssetSummary() {
    const container = document.getElementById('phaseAssetSummary');
    if (!container) return;
    const phases = currentMission?.phases || [];
    const assetLookup = Object.fromEntries((currentMission.assets || []).map((a) => [a.id, a]));
    if (!phases.length) {
      container.innerHTML = '<p class="muted">No phases defined yet.</p>';
      return;
    }
    container.innerHTML = phases
      .map((p) => {
        const names = (p.assetsUsed || [])
          .map((id) => assetLookup[id]?.name || 'Unassigned asset')
          .filter(Boolean)
          .join(', ');
        return `
          <div class="phase-summary-row">
            <div class="phase-summary-title">
              <strong>${p.name}</strong>
              <span class="muted">${p.description || ''}</span>
            </div>
            <div class="phase-summary-assets">${names || 'No assets assigned'}</div>
            <span class="pill">${p.assetsUsed?.length || 0} assets</span>
          </div>
        `;
      })
      .join('');
  }

  function renderConstraints() {
    document.getElementById('constraintTime').value = currentMission.constraints.timeWindow || '';
    document.getElementById('constraintEnvironment').value = currentMission.constraints.environment || '';
    document.getElementById('constraintRf').value = currentMission.constraints.rfConstraints || '';
    document.getElementById('constraintLogistics').value = currentMission.constraints.logisticsConstraints || '';
    document.getElementById('constraintSorties').value =
      currentMission.constraints.maxSorties !== null && currentMission.constraints.maxSorties !== undefined
        ? currentMission.constraints.maxSorties
        : '';
    document.getElementById('constraintReserve').value =
      currentMission.constraints.minBatteryReserve !== null && currentMission.constraints.minBatteryReserve !== undefined
        ? currentMission.constraints.minBatteryReserve
        : '';
    document.getElementById('constraintRfCoverage').checked = Boolean(currentMission.constraints.requireRfCoverage);
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
      <p><strong>Max Sorties:</strong> ${m.constraints.maxSorties || 'n/a'}</p>
      <p><strong>Battery Reserve:</strong> ${
        m.constraints.minBatteryReserve !== null && m.constraints.minBatteryReserve !== undefined
          ? `${m.constraints.minBatteryReserve}%`
          : 'n/a'
      }</p>
      <p><strong>RF Coverage Redundant:</strong> ${m.constraints.requireRfCoverage ? 'Required' : 'Best effort'}</p>
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

    const missionJson = JSON.stringify(buildMissionProjectPayload(), null, 2);
    document.getElementById('atakStub').value = JSON.stringify(buildAtakStub(m), null, 2);
    document.getElementById('copyJsonBtn').onclick = () => copyToClipboard(missionJson);
    document.getElementById('copyAtakBtn').onclick = () => copyToClipboard(document.getElementById('atakStub').value);

    renderMissionCards();
    renderFeasibility();
  }

  function renderMissionCards() {
    const container = document.getElementById('missionCards');
    if (!container) return;
    const phasesById = Object.fromEntries(currentMission.phases.map((p) => [p.id, p]));
    const grouped = {};
    currentMission.assignments.forEach((a) => {
      const asset = currentMission.assets.find((x) => x.id === a.assetId);
      if (!asset) return;
      const team = asset.ownerElement || a.team || 'Unassigned Team';
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push({ assignment: a, asset, phase: phasesById[a.phaseId] });
    });

    if (!Object.keys(grouped).length) {
      container.innerHTML = '<p class="muted">Add role assignments to generate mission cards.</p>';
      renderMissionSummaryBanner(0);
      return;
    }

    const cards = Object.entries(grouped)
      .map(([team, items]) => {
        const phaseNames = Array.from(new Set(items.map((i) => i.phase?.name).filter(Boolean))).join(', ') || '—';
        const taskSummary = Array.from(
          new Set(
            items
              .map((i) => (i.phase?.tasks || []).slice(0, 3))
              .flat()
              .filter(Boolean)
          )
        )
          .slice(0, 5)
          .join(', ');
        const sustainmentNotes = items
          .filter((i) => i.asset.type === 'KIT' || /kit/i.test(i.asset.type || ''))
          .map((i) => i.asset.notes || 'Sustainment kit')
          .join('; ');
        const commsNote = items.some((i) => i.assignment.requiresComms) ? 'Requires mesh/relay redundancy' : '';
        const assetLines = items
          .map((i) => {
            const roles = [i.assignment.role, ...(i.asset.roleTags || [])].filter(Boolean).join(', ');
            return `<li><strong>${i.asset.name}</strong> — ${roles || 'Role TBD'}${
              i.assignment.notes ? ` (${i.assignment.notes})` : ''
            }</li>`;
          })
          .join('');
        return `
          <div class="mission-card">
            <div class="card-header">
              <div>
                <div class="card-title">${team}</div>
                <div class="meta">Phases: ${phaseNames}</div>
              </div>
              ${items.some((i) => i.assignment.critical || i.asset.critical) ? '<span class="pill danger">Critical</span>' : ''}
            </div>
            <div class="card-body">
              <p><strong>Tasks:</strong> ${taskSummary || 'Align tasks per phase'}</p>
              <p><strong>Platforms / Nodes:</strong></p>
              <ul>${assetLines}</ul>
              ${sustainmentNotes ? `<p><strong>Sustainment:</strong> ${sustainmentNotes}</p>` : ''}
              ${commsNote ? `<p class="warning"><strong>Comms:</strong> ${commsNote}</p>` : ''}
            </div>
          </div>`;
      })
      .join('');
    container.innerHTML = cards;
    renderMissionSummaryBanner(Object.keys(grouped).length);
  }

  function renderMissionSummaryBanner(teamCount = 0) {
    const banner = document.getElementById('missionSummaryBanner');
    if (!banner) return;
    const meta = currentMission.missionMeta || {};
    const name = meta.name || currentMission.name || 'Untitled Mission';
    const duration = meta.durationHours ? `${meta.durationHours} hrs` : 'Not set';
    const env = [meta.altitudeBand, meta.temperatureBand].filter(Boolean).join(' / ') || 'n/a';
    banner.innerHTML = `
      <div class="title">${name}</div>
      <div class="meta">Duration: ${duration}</div>
      <div class="meta">Environment: ${env}</div>
      <div class="counts">Mission cards: ${teamCount}</div>
    `;
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
    document.getElementById('importMissionProjectBtn').addEventListener('click', () =>
      document.getElementById('missionProjectFile').click()
    );
    document.getElementById('missionProjectFile').addEventListener('change', downloadMissionProjectFromFile);
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
    const printCardsBtn = document.getElementById('printCardsBtn');
    if (printCardsBtn) printCardsBtn.addEventListener('click', () => window.print());
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
    document.getElementById('constraintSorties').addEventListener('input', (e) =>
      updateConstraint('maxSorties', e.target.value ? Number(e.target.value) : null)
    );
    document.getElementById('constraintReserve').addEventListener('input', (e) =>
      updateConstraint('minBatteryReserve', e.target.value ? Number(e.target.value) : null)
    );
    document.getElementById('constraintRfCoverage').addEventListener('change', (e) =>
      updateConstraint('requireRfCoverage', e.target.checked)
    );
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
      persistProject();
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
    persistProject();
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
    persistProject();
  }

  function onPhaseDelete(e) {
    const id = e.target.dataset.delete;
    currentMission.phases = currentMission.phases.filter((p) => p.id !== id);
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
    persistProject();
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
    persistProject();
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
    persistProject();
  }

  function seedAssets() {
    currentMission.assets.push(...getDemoAssets());
    renderAssets();
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
    persistProject();
  }

  function removeAsset(id) {
    currentMission.assets = currentMission.assets.filter((a) => a.id !== id);
    currentMission.phases.forEach((p) => (p.assetsUsed = (p.assetsUsed || []).filter((aid) => aid !== id)));
    renderAssets();
    renderPhases();
    renderAssignmentMatrix();
    renderBrief();
    persistProject();
  }

  function duplicateAsset(id) {
    const asset = currentMission.assets.find((a) => a.id === id);
    if (!asset) return;
    const copy = { ...asset, id: uuid(), name: `${asset.name} (copy)` };
    currentMission.assets.push(copy);
    renderAssets();
    renderAssignmentMatrix();
    renderPhases();
    persistProject();
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
    persistProject();
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
      team: missionElements[0],
      role: '',
      notes: '',
      critical: false,
      requiresComms: false
    });
    renderAssignments();
    renderMissionCards();
    persistProject();
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
    persistProject();
  }

  function onAssignmentRemove(e) {
    const id = e.target.dataset.removeAssignment;
    currentMission.assignments = currentMission.assignments.filter((a) => a.id !== id);
    renderAssignments();
    renderMissionCards();
    persistProject();
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
    persistProject();
  }

  function onCriterionChange(e) {
    const idx = Number(e.target.dataset.criterion);
    currentMission.constraints.successCriteria[idx] = e.target.value;
    renderBrief();
    persistProject();
  }
  function onCriterionRemove(e) {
    const idx = Number(e.target.dataset.removeCriterion);
    currentMission.constraints.successCriteria.splice(idx, 1);
    renderConstraints();
    renderBrief();
    persistProject();
  }
  function onCriterionAdd() {
    const value = document.getElementById('newCriterion').value.trim();
    if (!value) return;
    currentMission.constraints.successCriteria.push(value);
    renderConstraints();
    renderBrief();
    persistProject();
  }

  function updateMissionField(field, value) {
    currentMission[field] = value;
    renderBrief();
    persistProject();
  }

  function updateMetaField(field, value) {
    if (!currentMission.missionMeta) currentMission.missionMeta = {};
    currentMission.missionMeta[field] = value;
    if (['name', 'missionType', 'ao', 'unitOrDetachment', 'classificationBanner', 'createdBy', 'createdOn'].includes(field)) {
      currentMission[field] = value;
    }
    renderBrief();
    renderFeasibility();
    persistProject();
  }
  function updateConstraint(field, value) {
    currentMission.constraints[field] = value;
    renderBrief();
    persistProject();
  }

  function onParseClick(e) {
    const type = e.target.dataset.parse;
    const textarea = document.getElementById(`${type}Json`);
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;
    try {
      const data = JSON.parse(text);
      const parsed = parseIntegrationPayload(type, data);
      mergeProjectEntities(parsed);
      renderAll();
      persistProject();
      const counts = [
        parsed.nodes?.length || 0,
        parsed.platforms?.length || 0,
        parsed.mesh_links?.length || 0,
        parsed.kits?.length || 0
      ].reduce((a, b) => a + b, 0);
      showBanner(`Merged ${counts} records into MissionProject.`, 'info');
    } catch (err) {
      console.error(err);
      showBanner('Invalid JSON payload.', 'danger');
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
          const parsed = parseIntegrationPayload(type, data);
          mergeProjectEntities(parsed);
          renderAll();
          persistProject();
          showBanner('Import merged into MissionProject.', 'info');
        } catch (err) {
          console.error(err);
          showBanner('Invalid JSON file.', 'danger');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /** Storage **/
  function saveCurrentMission() {
    const snapshot = JSON.parse(JSON.stringify(currentMission));
    const idx = findMissionIndex(currentMission.id);
    if (idx >= 0) project.meta.savedMissions[idx] = snapshot;
    else project.meta.savedMissions.push(snapshot);
    persistProject();
    renderSavedMissions();
    alert('Mission saved locally');
  }

  function deleteCurrentMission() {
    if (!confirm('Delete this mission from local storage?')) return;
    project.meta.savedMissions = (project.meta.savedMissions || []).filter((m) => m.id !== currentMission.id);
    persistProject();
    createNewMission();
    renderSavedMissions();
  }

  function renderSavedMissions() {
    const list = document.getElementById('savedMissionsList');
    list.innerHTML = '';
    (project.meta.savedMissions || []).forEach((m) => {
      const btn = document.createElement('button');
      const title = m.missionMeta?.name || m.name || 'Untitled';
      const created = m.missionMeta?.createdOn || m.createdOn || '—';
      btn.textContent = `${title} (${created})`;
      btn.addEventListener('click', () => loadMissionById(m.id));
      list.appendChild(btn);
    });
  }

  function toggleSavedList() {
    const list = document.getElementById('savedMissionsList');
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
  }

  function loadMissionById(id) {
    const m = (project.meta.savedMissions || []).find((x) => x.id === id);
    if (!m) return;
    currentMission = hydrateMission(JSON.parse(JSON.stringify(m)));
    project.mission = currentMission;
    alignMissionMetaWithProject();
    renderAll();
    persistProject();
    toggleSavedList();
  }

  /** Export helpers **/
  function buildMissionProjectPayload() {
    syncMetaFromMission();
    const links = project.mesh_links?.length
      ? project.mesh_links
      : project.mission?.imports?.mesh?.links || currentMission.imports?.mesh?.links || [];
    const existingNodeIds = new Set((project.nodes || []).map((n) => n.id));
    const nodesFromAssets = currentMission.assets
      .filter((a) => (a.type === 'NODE' || a.type === 'MESH_ELEMENT') && !existingNodeIds.has(a.id))
      .map((a) => convertAssetToElement(a, a.type === 'MESH_ELEMENT' ? 'mesh' : 'node'));
    const existingPlatformIds = new Set((project.platforms || []).map((p) => p.id));
    const platformsFromAssets = currentMission.assets
      .filter((a) => (a.type === 'UXS' || a.type === 'PLATFORM') && !existingPlatformIds.has(a.id))
      .map((a) => convertAssetToElement(a, 'uxs'));
    const existingKitIds = new Set((project.kits || []).map((k) => k.id));
    const kitsFromAssets = currentMission.assets
      .filter((a) => a.type === 'KIT' && !existingKitIds.has(a.id))
      .map((a) => convertAssetToElement(a, 'kit'));

    const missionPayload = {
      ...currentMission,
      imports: {
        nodes: project.nodes || [],
        platforms: project.platforms || [],
        mesh: { links },
        kits: project.kits || []
      }
    };

    return normalizeMissionProject({
      schema: 'MissionProject',
      schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
      origin_tool: 'mission',
      meta: project.meta,
      mission: missionPayload,
      environment: project.environment,
      constraints: buildConstraintArrayFromMission(),
      nodes: [...project.nodes, ...nodesFromAssets],
      platforms: [...project.platforms, ...platformsFromAssets],
      kits: [...project.kits, ...kitsFromAssets],
      mesh_links: links.map((l) => ({ ...l, id: l.id || uuid(), origin_tool: l.origin_tool || 'mesh' }))
    });
  }

  function convertAssetToElement(asset, origin_tool = 'mission') {
    return {
      id: asset.id || uuid(),
      name: asset.name,
      role: (asset.roleTags || []).join(', '),
      rf_band: asset.rfBand || asset.frequency || '',
      power_draw_watts: asset.powerDrawWatts || null,
      battery_wh: asset.batteryWh || null,
      endurance_hours: getAssetEnduranceHours(asset),
      lat: asset.lat || asset.latitude || null,
      lon: asset.lon || asset.lng || asset.longitude || null,
      elevation: asset.elevation || null,
      origin_tool
    };
  }

  function convertElementToAsset(element, type, sourceTool = 'mission') {
    return {
      id: element.id || uuid(),
      name: element.name || `${type} asset`,
      type,
      sourceTool,
      roleTags: element.role ? element.role.split(',').map((r) => r.trim()).filter(Boolean) : element.roleTags || [],
      ownerElement: element.owner || element.ownerElement || '',
      notes: element.notes || '',
      rfBand: element.rf_band || element.rfBand,
      batteryWh: element.battery_wh,
      powerDrawWatts: element.power_draw_watts,
      enduranceHours: element.endurance_hours,
      lat: element.lat,
      lon: element.lon,
      elevation: element.elevation || null
    };
  }

  function downloadMissionJson() {
    const payload = buildMissionProjectPayload();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `${currentMission.name || 'mission'}-MissionProject.json`);
    a.click();
  }

  function downloadMissionProjectFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        importMissionProject(data);
        showBanner('MissionProject imported successfully.', 'info');
      } catch (err) {
        console.error(err);
        showBanner('Invalid MissionProject JSON.', 'danger');
      }
    };
    reader.readAsText(file);
  }

  function importMissionProject(data) {
    project = normalizeMissionProject(data);
    currentMission = hydrateMission(project.mission);
    alignMissionMetaWithProject();
    hydrateAssetsFromProject();
    currentMission.imports = {
      nodes: project.nodes || [],
      platforms: project.platforms || [],
      mesh: { links: project.mesh_links || [] },
      kits: project.kits || []
    };
    applyProjectEnvelope();
    renderAll();
    persistProject();
  }

  function hydrateAssetsFromProject() {
    const fromProject = [
      ...(project.nodes || []).map((n) => convertElementToAsset(n, 'NODE', n.origin_tool || 'node')),
      ...(project.platforms || []).map((p) => convertElementToAsset(p, 'UXS', p.origin_tool || 'uxs')),
      ...(project.kits || []).map((k) => convertElementToAsset(k, 'KIT', k.origin_tool || 'kit'))
    ];
    const existing = currentMission.assets || [];
    const mergedMap = new Map();
    [...fromProject, ...existing].forEach((asset) => {
      if (!mergedMap.has(asset.id)) mergedMap.set(asset.id, asset);
    });
    currentMission.assets = Array.from(mergedMap.values());
  }

  function buildGeoJsonPayload() {
    const mp = buildMissionProjectPayload();
    const features = [];
    const pointProps = (item, label) => ({
      name: item.name,
      role: item.role,
      type: label,
      origin_tool: item.origin_tool
    });

    mp.nodes.forEach((node) => {
      if (node.lat != null && node.lon != null)
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(node.lon), Number(node.lat)] },
          properties: pointProps(node, 'node')
        });
    });
    mp.platforms.forEach((platform) => {
      if (platform.lat != null && platform.lon != null)
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(platform.lon), Number(platform.lat)] },
          properties: pointProps(platform, 'platform')
        });
    });
    mp.kits.forEach((kit) => {
      if (kit.lat != null && kit.lon != null)
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(kit.lon), Number(kit.lat)] },
          properties: pointProps(kit, 'kit')
        });
    });

    const nodeLookup = Object.fromEntries(
      [...mp.nodes, ...mp.platforms, ...mp.kits].map((n) => [n.id, { lat: n.lat, lon: n.lon, name: n.name, origin: n.origin_tool }])
    );
    mp.mesh_links.forEach((link) => {
      const from = nodeLookup[link.from];
      const to = nodeLookup[link.to];
      if (from?.lat != null && to?.lat != null) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [Number(from.lon), Number(from.lat)],
              [Number(to.lon), Number(to.lat)]
            ]
          },
          properties: {
            id: link.id,
            from: link.from,
            to: link.to,
            quality: link.quality,
            rf_band: link.rf_band,
            origin_tool: link.origin_tool || 'mesh'
          }
        });
      }
    });

    return { type: 'FeatureCollection', features };
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
  }

  function buildAtakStub(m) {
    const mp = buildMissionProjectPayload();
    return {
      schema: 'CoT-lite',
      mission: {
        id: m.id,
        name: m.missionMeta?.name || m.name,
        unit: m.missionMeta?.unitOrDetachment || m.unitOrDetachment,
        ao: m.missionMeta?.ao || m.ao,
        timeframe: m.constraints.timeWindow,
        altitudeBand: m.missionMeta?.altitudeBand,
        temperatureBand: m.missionMeta?.temperatureBand
      },
      units: [
        ...mp.nodes.map((n) => ({
          id: n.id,
          callsign: n.name,
          role: n.role,
          lat: n.lat,
          lon: n.lon,
          elev: n.elevation,
          rf_band: n.rf_band,
          type: 'node',
          origin_tool: n.origin_tool
        })),
        ...mp.platforms.map((p) => ({
          id: p.id,
          callsign: p.name,
          role: p.role,
          lat: p.lat,
          lon: p.lon,
          elev: p.elevation,
          rf_band: p.rf_band,
          type: 'platform',
          origin_tool: p.origin_tool
        }))
      ],
      links: mp.mesh_links.map((l) => ({ id: l.id, from: l.from, to: l.to, quality: l.quality, rf_band: l.rf_band }))
    };
  }

  /** Integration parsers and mergers **/
  function parseIntegrationPayload(type, data) {
    if (Array.isArray(data)) {
      const quick = { nodes: [], platforms: [], mesh_links: [], kits: [] };
      if (type === 'node') quick.nodes = data;
      else if (type === 'uxs' || type === 'platform') quick.platforms = data;
      else if (type === 'mesh') quick.mesh_links = data;
      else if (type === 'kit') quick.kits = data;
      else quick.nodes = data;
      return normalizeSectionsForProject(quick);
    }
    const sections = extractMissionProjectSections(data);
    const normalized = normalizeSectionsForProject(sections);
    if (type === 'node') return { nodes: normalized.nodes };
    if (type === 'uxs' || type === 'platform') return { platforms: normalized.platforms };
    if (type === 'mesh') return { mesh_links: normalized.mesh_links };
    if (type === 'kit') return { kits: normalized.kits };
    return normalized;
  }

  function extractMissionProjectSections(data) {
    const pickFirstArray = (...candidates) => candidates.find((c) => Array.isArray(c) && c.length) || [];
    return {
      nodes: pickFirstArray(
        data?.nodes,
        data?.mission?.imports?.nodes,
        data?.imports?.nodes,
        data?.mission?.nodes
      ),
      platforms: pickFirstArray(
        data?.platforms,
        data?.mission?.imports?.platforms,
        data?.imports?.platforms,
        data?.mission?.platforms
      ),
      mesh_links: pickFirstArray(
        data?.mesh_links,
        data?.mesh?.links,
        data?.links,
        data?.mission?.imports?.mesh?.links
      ),
      kits: pickFirstArray(data?.kits, data?.mission?.imports?.kits, data?.imports?.kits)
    };
  }

  function normalizeSectionsForProject(sections) {
    return {
      nodes: (sections.nodes || []).map((n) => normalizeElementRecord(n, 'node')),
      platforms: (sections.platforms || []).map((p) => normalizeElementRecord(p, 'uxs')),
      mesh_links: (sections.mesh_links || []).map((l) => normalizeMeshLink(l)),
      kits: (sections.kits || []).map((k) => normalizeElementRecord(k, 'kit'))
    };
  }

  function normalizeElementRecord(item, origin_tool = 'mission') {
    const enduranceHours =
      item.endurance_hours ?? item.enduranceHours ?? (item.enduranceMinutes ? item.enduranceMinutes / 60 : null);
    return {
      ...item,
      id: item.id || uuid(),
      name: item.name || item.label || `${origin_tool} asset`,
      role: item.role || (item.roleTags || []).join(', '),
      rf_band: item.rf_band || item.rfBand || item.frequency || '',
      power_draw_watts: item.power_draw_watts ?? item.powerDrawWatts ?? null,
      battery_wh: item.battery_wh ?? item.batteryWh ?? null,
      endurance_hours: enduranceHours,
      lat: item.lat ?? item.latitude ?? null,
      lon: item.lon ?? item.lng ?? item.longitude ?? null,
      elevation: item.elevation ?? null,
      origin_tool: item.origin_tool || item.sourceTool || origin_tool
    };
  }

  function normalizeMeshLink(link) {
    return {
      id: link.id || uuid(),
      from: link.from || link.source || link.a || link.start,
      to: link.to || link.target || link.b || link.end,
      quality: link.quality || link.link_quality || link.status || 'Unknown',
      rf_band: link.rf_band || link.rfBand || link.band,
      notes: link.notes || link.description || '',
      origin_tool: link.origin_tool || 'mesh'
    };
  }

  function mergeProjectEntities({ nodes = [], platforms = [], mesh_links = [], kits = [] }) {
    const mergeArray = (existing = [], incoming = [], defaultOrigin = 'mission') => {
      const map = new Map();
      existing.forEach((item) => {
        const key = item.id || item.name;
        map.set(key, { ...item });
      });
      incoming.forEach((item) => {
        const key = item.id || item.name || uuid();
        const merged = {
          ...(map.get(key) || {}),
          ...item,
          id: item.id || key,
          origin_tool: item.origin_tool || defaultOrigin
        };
        map.set(key, merged);
      });
      return Array.from(map.values());
    };

    project.nodes = mergeArray(project.nodes, nodes, 'node');
    project.platforms = mergeArray(project.platforms, platforms, 'uxs');
    project.kits = mergeArray(project.kits, kits, 'kit');
    project.mesh_links = mergeArray(project.mesh_links, mesh_links, 'mesh');

    currentMission.imports = {
      nodes: project.nodes,
      platforms: project.platforms,
      mesh: { links: project.mesh_links },
      kits: project.kits
    };
    hydrateAssetsFromProject();
    project.mission = currentMission;
    renderPhaseAssetSummary();
  }

  function getAssetEnduranceHours(asset) {
    if (asset.enduranceHours) return Number(asset.enduranceHours);
    if (asset.enduranceMinutes) return Number(asset.enduranceMinutes) / 60;
    return null;
  }

  function downloadMissionOverlay() {
    const geojson = buildGeoJsonPayload();
    if (!geojson.features.length) {
      showBanner('No coordinates available to export.', 'danger');
      return;
    }
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
    ensureProject();
    if (!currentMission) createNewMission();
    renderAll();
    bindEvents();
    const hash = window.location.hash.replace('#', '');
    if (hash) switchPanel(hash);
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
    if (!m.id) m.id = uuid();
    if (!m.phases || !m.phases.length) m.phases = JSON.parse(JSON.stringify(defaultPhases));
    if (!m.constraints) {
      m.constraints = {
        timeWindow: '',
        environment: '',
        rfConstraints: '',
        logisticsConstraints: '',
        maxSorties: null,
        minBatteryReserve: null,
        requireRfCoverage: false,
        successCriteria: [],
        riskNotes: ''
      };
    }
    if (!m.assignments) m.assignments = [];
    if (!m.imports) m.imports = { nodes: [], platforms: [], mesh: null };
    return m;
  }

  document.addEventListener('DOMContentLoaded', init);
})();

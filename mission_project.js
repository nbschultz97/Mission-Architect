const MISSION_PROJECT_SCHEMA_VERSION = '2.0.0';
const MISSION_PROJECT_STORAGE_KEY = 'ceradonMissionProject';

function createEmptyMissionProject() {
  const today = new Date().toISOString().split('T')[0];
  return {
    schema: 'MissionProject',
    schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
    origin_tool: 'mission',
    meta: {
      name: '',
      durationHours: 0,
      altitudeBand: 'Surface',
      temperatureBand: 'Temperate',
      savedMissions: [],
      lastUpdated: today,
      origin_tool: 'mission'
    },
    mission: {
      id: `mission-${Math.random().toString(36).slice(2, 9)}`,
      origin_tool: 'mission',
      missionMeta: {
        name: '',
        classificationBanner: 'UNCLASSIFIED // TRAINING USE',
        ao: '',
        unitOrDetachment: '',
        createdOn: today,
        createdBy: '',
        missionType: 'Recon',
        durationHours: 0,
        altitudeBand: 'Surface',
        temperatureBand: 'Temperate'
      },
      phases: [],
      assets: [],
      assignments: [],
      imports: { nodes: [], platforms: [], mesh: null, kits: [] },
      constraints: {
        timeWindow: '',
        environment: '',
        rfConstraints: '',
        logisticsConstraints: '',
        maxSorties: null,
        minBatteryReserve: null,
        requireRfCoverage: false,
        successCriteria: [],
        riskNotes: ''
      }
    },
    nodes: [],
    platforms: [],
    mesh_links: [],
    kits: [],
    environment: {
      ao: '',
      altitudeBand: 'Surface',
      temperatureBand: 'Temperate',
      elevationRef: null,
      weather: '',
      logisticsNotes: ''
    },
    constraints: []
  };
}

function migrateMissionProject(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyMissionProject();
  const isLegacy = !raw.schemaVersion || /^1\./.test(raw.schemaVersion) || raw.version === '1';
  if (!isLegacy) return raw;

  const today = new Date().toISOString().split('T')[0];
  const base = createEmptyMissionProject();
  const legacyMission = raw.mission || raw;
  const missionMeta = {
    ...base.mission.missionMeta,
    ...(legacyMission.missionMeta || {}),
    name: legacyMission.missionMeta?.name || legacyMission.name || raw.name || '',
    ao: legacyMission.missionMeta?.ao || legacyMission.ao || raw.ao || '',
    unitOrDetachment:
      legacyMission.missionMeta?.unitOrDetachment || legacyMission.unitOrDetachment || raw.unitOrDetachment || '',
    classificationBanner: legacyMission.missionMeta?.classificationBanner || legacyMission.classificationBanner ||
      raw.classificationBanner || base.mission.missionMeta.classificationBanner,
    createdOn: legacyMission.missionMeta?.createdOn || legacyMission.createdOn || raw.createdOn || today,
    createdBy: legacyMission.missionMeta?.createdBy || legacyMission.createdBy || raw.createdBy || '',
    missionType: legacyMission.missionMeta?.missionType || legacyMission.missionType || raw.missionType || 'Recon',
    durationHours: legacyMission.missionMeta?.durationHours || legacyMission.durationHours || raw.durationHours || 0,
    altitudeBand: legacyMission.missionMeta?.altitudeBand || legacyMission.altitudeBand || raw.altitudeBand || 'Surface',
    temperatureBand:
      legacyMission.missionMeta?.temperatureBand || legacyMission.temperatureBand || raw.temperatureBand || 'Temperate'
  };

  const constraints = {
    ...base.mission.constraints,
    ...(legacyMission.constraints || {}),
    timeWindow: legacyMission.constraints?.timeWindow || legacyMission.timeWindow || raw.timeWindow || ''
  };

  return {
    ...raw,
    schema: 'MissionProject',
    schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
    origin_tool: raw.origin_tool || 'mission',
    mission: {
      ...base.mission,
      ...legacyMission,
      missionMeta,
      constraints,
      imports: legacyMission.imports || { nodes: raw.nodes || [], platforms: raw.platforms || [], mesh: raw.mesh || null, kits: raw.kits || [] }
    },
    environment: {
      ...base.environment,
      ...(raw.environment || {}),
      ao: missionMeta.ao || raw.environment?.ao || ''
    }
  };
}

function normalizeMissionProject(raw) {
  const base = createEmptyMissionProject();
  const migrated = migrateMissionProject(raw);
  if (!migrated || typeof migrated !== 'object') return base;
  const project = { ...base, ...migrated };
  project.schema = 'MissionProject';
  project.schemaVersion = migrated.schemaVersion || migrated.version || base.schemaVersion;
  project.origin_tool = migrated.origin_tool || 'mission';
  project.meta = { ...base.meta, ...(migrated.meta || {}) };
  project.meta.origin_tool = project.meta.origin_tool || 'mission';
  project.mission = { ...base.mission, ...(migrated.mission || migrated) };
  project.mission.origin_tool = project.mission.origin_tool || 'mission';
  project.mission.missionMeta = { ...base.mission.missionMeta, ...(project.mission.missionMeta || {}) };
  project.mission.imports = { ...base.mission.imports, ...(project.mission.imports || {}) };
  project.mission.constraints = { ...base.mission.constraints, ...(project.mission.constraints || {}) };

  project.nodes = Array.isArray(migrated.nodes) ? migrated.nodes : base.nodes;
  project.platforms = Array.isArray(migrated.platforms) ? migrated.platforms : base.platforms;
  project.mesh_links = Array.isArray(migrated.mesh_links)
    ? migrated.mesh_links
    : Array.isArray(migrated.mesh?.links)
    ? migrated.mesh.links
    : base.mesh_links;
  project.kits = Array.isArray(migrated.kits) ? migrated.kits : base.kits;
  project.environment = { ...base.environment, ...(migrated.environment || {}) };
  project.constraints = Array.isArray(migrated.constraints) ? migrated.constraints : base.constraints;

  // Backwards compatibility for legacy imports stored under mission.imports
  if (Array.isArray(project.mission.imports?.nodes) && !project.nodes.length) project.nodes = project.mission.imports.nodes;
  if (Array.isArray(project.mission.imports?.platforms) && !project.platforms.length)
    project.platforms = project.mission.imports.platforms;
  if (Array.isArray(project.mission.imports?.kits) && !project.kits.length) project.kits = project.mission.imports.kits;
  if (project.mission.imports?.mesh && !project.mesh_links.length) project.mesh_links = project.mission.imports.mesh.links || [];

  // Stabilize IDs and origin tags
  ['nodes', 'platforms', 'mesh_links', 'kits'].forEach((key) => {
    project[key] = (project[key] || []).map((item) => ({
      ...item,
      id: item.id || `mp-${key}-${Math.random().toString(36).slice(2, 9)}`,
      origin_tool: item.origin_tool || item.sourceTool || 'mission'
    }));
  });

  if (!project.meta.savedMissions) project.meta.savedMissions = [];
  return project;
}

function loadMissionProject() {
  try {
    const raw = localStorage.getItem(MISSION_PROJECT_STORAGE_KEY);
    if (!raw) return createEmptyMissionProject();
    return normalizeMissionProject(JSON.parse(raw));
  } catch (err) {
    console.warn('Failed to load mission project, resetting.', err);
    return createEmptyMissionProject();
  }
}

function saveMissionProject(project) {
  const payload = normalizeMissionProject(project);
  payload.meta.lastUpdated = new Date().toISOString();
  payload.schemaVersion = MISSION_PROJECT_SCHEMA_VERSION;
  localStorage.setItem(MISSION_PROJECT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

if (typeof window !== 'undefined') {
  window.MISSION_PROJECT_SCHEMA_VERSION = MISSION_PROJECT_SCHEMA_VERSION;
  window.createEmptyMissionProject = createEmptyMissionProject;
  window.loadMissionProject = loadMissionProject;
  window.saveMissionProject = saveMissionProject;
  window.normalizeMissionProject = normalizeMissionProject;
}

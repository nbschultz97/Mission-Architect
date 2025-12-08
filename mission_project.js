const MISSION_PROJECT_SCHEMA_VERSION = '1.1.0';
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

function normalizeMissionProject(raw) {
  const base = createEmptyMissionProject();
  if (!raw || typeof raw !== 'object') return base;
  const project = { ...base, ...raw };
  project.schema = 'MissionProject';
  project.schemaVersion = raw.schemaVersion || raw.version || base.schemaVersion;
  project.origin_tool = raw.origin_tool || 'mission';
  project.meta = { ...base.meta, ...(raw.meta || {}) };
  project.meta.origin_tool = project.meta.origin_tool || 'mission';
  project.mission = { ...base.mission, ...(raw.mission || raw) };
  project.mission.origin_tool = project.mission.origin_tool || 'mission';
  project.mission.missionMeta = { ...base.mission.missionMeta, ...(project.mission.missionMeta || {}) };
  project.mission.imports = { ...base.mission.imports, ...(project.mission.imports || {}) };
  project.mission.constraints = { ...base.mission.constraints, ...(project.mission.constraints || {}) };

  project.nodes = Array.isArray(raw.nodes) ? raw.nodes : base.nodes;
  project.platforms = Array.isArray(raw.platforms) ? raw.platforms : base.platforms;
  project.mesh_links = Array.isArray(raw.mesh_links) ? raw.mesh_links : Array.isArray(raw.mesh?.links) ? raw.mesh.links : base.mesh_links;
  project.kits = Array.isArray(raw.kits) ? raw.kits : base.kits;
  project.environment = { ...base.environment, ...(raw.environment || {}) };
  project.constraints = Array.isArray(raw.constraints) ? raw.constraints : base.constraints;

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

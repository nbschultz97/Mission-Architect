const MISSION_PROJECT_SCHEMA_VERSION = '1.0.0';
const MISSION_PROJECT_STORAGE_KEY = 'ceradonMissionProject';

function createEmptyMissionProject() {
  const today = new Date().toISOString().split('T')[0];
  return {
    schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
    meta: {
      name: '',
      durationHours: 0,
      altitudeBand: 'Surface',
      temperatureBand: 'Temperate',
      savedMissions: [],
      lastUpdated: today
    },
    mission: {
      id: `mission-${Math.random().toString(36).slice(2, 9)}`,
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
      imports: { nodes: [], platforms: [], mesh: null },
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
    kits: []
  };
}

function loadMissionProject() {
  try {
    const raw = localStorage.getItem(MISSION_PROJECT_STORAGE_KEY);
    if (!raw) return createEmptyMissionProject();
    const project = JSON.parse(raw);
    if (!project.mission) project.mission = createEmptyMissionProject().mission;
    if (!project.meta) project.meta = createEmptyMissionProject().meta;
    if (!project.meta.savedMissions) project.meta.savedMissions = [];
    project.schemaVersion = project.schemaVersion || MISSION_PROJECT_SCHEMA_VERSION;
    return project;
  } catch (err) {
    console.warn('Failed to load mission project, resetting.', err);
    return createEmptyMissionProject();
  }
}

function saveMissionProject(project) {
  const payload = { ...project, schemaVersion: MISSION_PROJECT_SCHEMA_VERSION };
  localStorage.setItem(MISSION_PROJECT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

if (typeof window !== 'undefined') {
  window.MISSION_PROJECT_SCHEMA_VERSION = MISSION_PROJECT_SCHEMA_VERSION;
  window.createEmptyMissionProject = createEmptyMissionProject;
  window.loadMissionProject = loadMissionProject;
  window.saveMissionProject = saveMissionProject;
}

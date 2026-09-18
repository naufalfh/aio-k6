// Workload profiles. Select one at runtime with `-e PROFILE=<name>`.
//
//   kind "api" -> protocol-level tests (k6/http). Can scale to many VUs.
//   kind "web" -> browser-level tests (k6/browser). Each VU spawns a Chrome
//                 instance, so keep VU counts small.
//
// Each profile is a k6 scenario definition (without the scenario name).

const BROWSER = { browser: { type: 'chromium' } };

export const PROFILES = {
  api: {
    // Quick sanity run: is the system and the script working at all?
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '20s',
    },
    // Expected production-like traffic held for a while.
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // Push well beyond expected traffic to find the breaking point.
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // Sudden burst of traffic, then back to normal.
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },

  web: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '2m',
      options: BROWSER,
    },
    load: {
      executor: 'constant-vus',
      vus: 3,
      duration: '1m',
      options: BROWSER,
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      options: BROWSER,
    },
  },
};

export function getProfile(kind, name) {
  const byKind = PROFILES[kind];
  if (!byKind) {
    throw new Error(`Unknown test kind "${kind}". Expected one of: ${Object.keys(PROFILES).join(', ')}`);
  }
  const profile = byKind[name];
  if (!profile) {
    throw new Error(
      `Unknown PROFILE "${name}" for kind "${kind}". Expected one of: ${Object.keys(byKind).join(', ')}`,
    );
  }
  // Return a copy so callers can safely mutate.
  return JSON.parse(JSON.stringify(profile));
}

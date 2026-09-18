// Default pass/fail criteria per kind and profile.
// Test files can extend or override these via buildOptions({ thresholds }).

const API_BASE = {
  checks: ['rate>0.99'],
  http_req_failed: ['rate<0.01'],
};

// Web Vitals targets. Google's "good" LCP is < 2.5s; the public QuickPizza demo
// regularly shows TTFB > 2s, so the defaults here are looser. Tighten them per
// test via buildOptions({ thresholds }) when targeting your own environment.
const WEB_BASE = {
  checks: ['rate>0.99'],
  browser_web_vital_lcp: ['p(75)<6000'],
  browser_web_vital_cls: ['p(75)<0.1'],
};

export const THRESHOLDS = {
  api: {
    smoke: { ...API_BASE, http_req_duration: ['p(95)<1500'] },
    load: { ...API_BASE, http_req_duration: ['p(95)<800'] },
    stress: {
      checks: ['rate>0.95'],
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<2000'],
    },
    spike: {
      checks: ['rate>0.90'],
      http_req_failed: ['rate<0.10'],
      http_req_duration: ['p(95)<3000'],
    },
  },
  web: {
    smoke: { ...WEB_BASE },
    load: { ...WEB_BASE },
    stress: {
      checks: ['rate>0.95'],
      browser_web_vital_lcp: ['p(75)<8000'],
    },
  },
};

export function getThresholds(kind, name) {
  const byKind = THRESHOLDS[kind] || {};
  return { ...(byKind[name] || {}) };
}

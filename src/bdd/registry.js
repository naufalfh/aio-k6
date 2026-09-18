// Step-definition registry (Cucumber-like).
//
//   Given('I open the {string} page', function (name) { ... })
//   When(/^I wait (\d+) seconds$/, function (n) { ... })
//
// String patterns support the placeholders {string} {int} {float} {word} {}.
// Regex patterns are used as-is. Step functions receive the captured values
// as arguments (typed) and are invoked with `this` bound to the BDD world.
// If the Gherkin step has a data table or doc string, it is passed as the last argument.

const definitions = [];

const PLACEHOLDERS = {
  '{string}': { re: '"([^"]*)"|\'([^\']*)\'', cast: (v) => v },
  '{int}': { re: '(-?\\d+)', cast: (v) => parseInt(v, 10) },
  '{float}': { re: '(-?\\d+(?:\\.\\d+)?)', cast: (v) => parseFloat(v) },
  '{word}': { re: '(\\S+)', cast: (v) => v },
  '{}': { re: '(.*)', cast: (v) => v },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile(pattern) {
  if (pattern instanceof RegExp) {
    return { regex: pattern, casts: [] };
  }
  const casts = [];
  let out = '';
  let rest = pattern;
  while (rest.length) {
    const idx = rest.indexOf('{');
    if (idx < 0) {
      out += escapeRegex(rest);
      break;
    }
    out += escapeRegex(rest.slice(0, idx));
    const end = rest.indexOf('}', idx);
    if (end < 0) throw new Error(`Step pattern has unclosed "{": ${pattern}`);
    const token = rest.slice(idx, end + 1);
    const ph = PLACEHOLDERS[token];
    if (!ph) throw new Error(`Unknown placeholder ${token} in step pattern: ${pattern}`);
    // {string} has two alternatives (double / single quotes) -> wrap in a group
    // and merge later; simplest is to use a non-capturing outer with two captures.
    out += `(?:${ph.re})`;
    casts.push(ph.cast);
    rest = rest.slice(end + 1);
  }
  return { regex: new RegExp(`^${out}$`), casts };
}

function define(keyword, pattern, fn) {
  if (typeof fn !== 'function') {
    throw new Error(`Step definition for "${pattern}" must be a function`);
  }
  const { regex, casts } = compile(pattern);
  definitions.push({ keyword, pattern: String(pattern), regex, casts, fn });
}

export const Given = (pattern, fn) => define('Given', pattern, fn);
export const When = (pattern, fn) => define('When', pattern, fn);
export const Then = (pattern, fn) => define('Then', pattern, fn);
/** Keyword-agnostic definition (matches any Given/When/Then). */
export const Step = (pattern, fn) => define('*', pattern, fn);

/**
 * Find the single definition matching a step text.
 * Returns { fn, args }. Throws on undefined or ambiguous steps.
 */
export function findStep(step) {
  const matches = [];
  for (const def of definitions) {
    const m = def.regex.exec(step.text);
    if (!m) continue;
    // Keyword does not restrict matching (like Cucumber) but is kept for messages.
    matches.push({ def, m });
  }

  if (matches.length === 0) {
    throw new Error(`Undefined step: ${step.keyword} ${step.text}`);
  }
  if (matches.length > 1) {
    const list = matches.map((x) => `  - ${x.def.pattern}`).join('\n');
    throw new Error(`Ambiguous step "${step.keyword} ${step.text}" matches:\n${list}`);
  }

  const { def, m } = matches[0];
  const raw = m.slice(1).filter((v) => v !== undefined);
  const args = raw.map((v, i) => (def.casts[i] ? def.casts[i](v) : v));
  if (step.table) args.push(step.table);
  if (step.docString !== undefined) args.push(step.docString);
  return { fn: def.fn, args, pattern: def.pattern };
}

/** Testing/debug helper. */
export function listSteps() {
  return definitions.map((d) => `${d.keyword} ${d.pattern}`);
}

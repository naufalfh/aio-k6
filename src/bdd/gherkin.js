// Minimal Gherkin parser. Supports:
//   Feature, Background, Scenario, Scenario Outline / Examples,
//   Given/When/Then/And/But/*, tags (@tag), comments (#), data tables (| a | b |),
//   doc strings ("""). Scenario Outlines are expanded into concrete scenarios.
//
// Output shape:
// {
//   name, tags, background: [step],
//   scenarios: [{ name, tags, steps: [{ keyword, text, table?, docString? }] }]
// }

const STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But', '*'];

function parseTableRow(line) {
  return line
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
}

function substitute(text, row) {
  return text.replace(/<([^>]+)>/g, (m, key) => (key in row ? row[key] : m));
}

export function parseFeature(source) {
  const lines = source.split(/\r?\n/);
  const feature = { name: '', tags: [], background: [], scenarios: [] };

  let pendingTags = [];
  let current = null; // { type: 'background'|'scenario'|'outline', ... }
  let lastKeyword = 'Given';
  let inExamples = false;
  let exampleHeader = null;
  let docString = null; // { step, lines }

  const finishCurrent = () => {
    if (!current) return;
    if (current.type === 'background') {
      feature.background = current.steps;
    } else if (current.type === 'scenario') {
      feature.scenarios.push({ name: current.name, tags: current.tags, steps: current.steps });
    } else if (current.type === 'outline') {
      for (const row of current.examples) {
        const label = Object.entries(row)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        feature.scenarios.push({
          name: `${current.name} (${label})`,
          tags: current.tags,
          steps: current.steps.map((s) => ({
            ...s,
            text: substitute(s.text, row),
            table: s.table ? s.table.map((r) => r.map((c) => substitute(c, row))) : undefined,
            docString: s.docString !== undefined ? substitute(s.docString, row) : undefined,
          })),
        });
      }
    }
    current = null;
    inExamples = false;
    exampleHeader = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Doc string handling
    if (docString) {
      if (line === '"""') {
        docString.step.docString = docString.lines.join('\n');
        docString = null;
      } else {
        docString.lines.push(raw.replace(/^\s{0,6}/, ''));
      }
      continue;
    }

    if (line === '' || line.startsWith('#')) continue;

    if (line.startsWith('@')) {
      pendingTags = pendingTags.concat(line.split(/\s+/).filter((t) => t.startsWith('@')));
      continue;
    }

    if (line.startsWith('Feature:')) {
      feature.name = line.slice('Feature:'.length).trim();
      feature.tags = pendingTags;
      pendingTags = [];
      continue;
    }

    if (line.startsWith('Background:')) {
      finishCurrent();
      current = { type: 'background', steps: [] };
      continue;
    }

    if (line.startsWith('Scenario Outline:') || line.startsWith('Scenario Template:')) {
      finishCurrent();
      current = {
        type: 'outline',
        name: line.slice(line.indexOf(':') + 1).trim(),
        tags: feature.tags.concat(pendingTags),
        steps: [],
        examples: [],
      };
      pendingTags = [];
      continue;
    }

    if (line.startsWith('Scenario:') || line.startsWith('Example:')) {
      finishCurrent();
      current = {
        type: 'scenario',
        name: line.slice(line.indexOf(':') + 1).trim(),
        tags: feature.tags.concat(pendingTags),
        steps: [],
      };
      pendingTags = [];
      continue;
    }

    if (line.startsWith('Examples:') || line.startsWith('Scenarios:')) {
      if (!current || current.type !== 'outline') {
        throw new Error(`Gherkin: "Examples:" found outside a Scenario Outline: ${line}`);
      }
      inExamples = true;
      exampleHeader = null;
      continue;
    }

    if (line.startsWith('|')) {
      const cells = parseTableRow(line);
      if (inExamples) {
        if (!exampleHeader) {
          exampleHeader = cells;
        } else {
          const row = {};
          exampleHeader.forEach((h, i) => (row[h] = cells[i] !== undefined ? cells[i] : ''));
          current.examples.push(row);
        }
      } else if (current && current.steps.length) {
        const step = current.steps[current.steps.length - 1];
        step.table = step.table || [];
        step.table.push(cells);
      } else {
        throw new Error(`Gherkin: table row without a step: ${line}`);
      }
      continue;
    }

    if (line === '"""') {
      if (!current || !current.steps.length) {
        throw new Error('Gherkin: doc string without a step');
      }
      docString = { step: current.steps[current.steps.length - 1], lines: [] };
      continue;
    }

    const kw = STEP_KEYWORDS.find((k) => line.startsWith(k + ' ') || line === k);
    if (kw) {
      if (!current) {
        throw new Error(`Gherkin: step found outside a Scenario/Background: ${line}`);
      }
      const keyword = kw === 'And' || kw === 'But' || kw === '*' ? lastKeyword : kw;
      lastKeyword = keyword;
      current.steps.push({ keyword, text: line.slice(kw.length).trim() });
      continue;
    }

    // Free-text description lines are allowed directly under Feature:/Scenario:
    // headers (before the first step).
    if (!current) {
      feature.description = (feature.description ? feature.description + '\n' : '') + line;
      continue;
    }
    if (current.steps.length === 0 && !inExamples) {
      current.description = (current.description ? current.description + '\n' : '') + line;
      continue;
    }

    throw new Error(`Gherkin: unrecognised line: "${line}"`);
  }

  finishCurrent();
  return feature;
}

const state = {
  symptoms: [],
  rules: [],
  knownProducts: {
    motherboards: [],
    cpus: [],
  },
};

const els = {
  diagnosticForm: document.getElementById('diagnosticForm'),
  symptomChecklist: document.getElementById('symptomChecklist'),
  suggestBtn: document.getElementById('suggestBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  suggestionsEmpty: document.getElementById('suggestionsEmpty'),
  suggestionsResults: document.getElementById('suggestionsResults'),
  primaryCause: document.getElementById('primaryCause'),
  supportingSignal: document.getElementById('supportingSignal'),
  likelyCausesList: document.getElementById('likelyCausesList'),
  nextStepsList: document.getElementById('nextStepsList'),
  matchedRulesList: document.getElementById('matchedRulesList'),
  motherboardSelect: document.getElementById('motherboardSelect'),
  motherboardCustom: document.getElementById('motherboardCustom'),
  cpuSelect: document.getElementById('cpuSelect'),
  boardLogMotherboard: document.getElementById('boardLogMotherboard'),
  boardLogMotherboardCustom: document.getElementById('boardLogMotherboardCustom'),
  boardLogIssue: document.getElementById('boardLogIssue'),
  boardLogFix: document.getElementById('boardLogFix'),
  boardLogStatus: document.getElementById('boardLogStatus'),
  copyBoardLogBtn: document.getElementById('copyBoardLogBtn'),
  clearBoardLogBtn: document.getElementById('clearBoardLogBtn'),
};

function loadJson(path) {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  });
}

function populateKnownProductSelect(selectEl, groups, placeholderText) {
  selectEl.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = placeholderText;
  selectEl.appendChild(placeholder);

  groups.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.group;

    (group.items || []).forEach((item) => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      optgroup.appendChild(option);
    });

    selectEl.appendChild(optgroup);
  });

  const customOption = document.createElement('option');
  customOption.value = '__custom__';
  customOption.textContent = 'Custom / Not Listed';
  selectEl.appendChild(customOption);
}

function toggleCustomField(selectEl, inputEl) {
  const isCustom = selectEl.value === '__custom__';
  inputEl.classList.toggle('hidden', !isCustom);
  inputEl.disabled = !isCustom;
  inputEl.required = isCustom;
  if (!isCustom) inputEl.value = '';
}

function getSelectedOrCustom(selectEl, inputEl) {
  if (selectEl.value === '__custom__') return inputEl.value.trim();
  return selectEl.value.trim();
}

function setSelectOrCustom(selectEl, inputEl, value) {
  const normalizedValue = (value || '').trim();
  const hasOption = [...selectEl.options].some((option) => option.value === normalizedValue);

  if (normalizedValue && hasOption) {
    selectEl.value = normalizedValue;
    inputEl.value = '';
  } else if (normalizedValue) {
    selectEl.value = '__custom__';
    inputEl.value = normalizedValue;
  } else {
    selectEl.value = '';
    inputEl.value = '';
  }

  toggleCustomField(selectEl, inputEl);
}

function createChecklistItems(container, items, name) {
  container.innerHTML = '';
  items.forEach((item) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'check-item';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = item;

    const span = document.createElement('span');
    span.textContent = item;

    wrapper.append(input, span);
    container.appendChild(wrapper);
  });
}

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function setDefaults() {
  els.diagnosticForm.reset();
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });

  els.motherboardSelect.value = '';
  els.cpuSelect.value = '';
  toggleCustomField(els.motherboardSelect, els.motherboardCustom);
  renderSuggestions();
}

function loadSample() {
  setSelectOrCustom(els.motherboardSelect, els.motherboardCustom, 'MAG B650 TOMAHAWK WIFI');
  els.cpuSelect.value = 'High';
  document.getElementById('cooler').value = '360mm AIO';
  document.getElementById('ramTotalGb').value = '32';
  document.getElementById('ramModules').value = '2';
  document.getElementById('gpuPresent').value = 'true';
  document.getElementById('gpuModel').value = 'RTX 4080 Super';
  document.getElementById('riserCable').value = 'true';
  document.getElementById('storage').value = 'Gen 4';

  renderSuggestions();
}

function formToCaseObject() {
  return {
    system: {
      motherboard: getSelectedOrCustom(els.motherboardSelect, els.motherboardCustom),
      cpu: els.cpuSelect.value,
      cooler: document.getElementById('cooler').value.trim(),
      ram_total_gb: Number(document.getElementById('ramTotalGb').value || 0),
      ram_modules: Number(document.getElementById('ramModules').value || 0),
      gpu_present: document.getElementById('gpuPresent').value === 'true',
      gpu_model: document.getElementById('gpuModel').value.trim(),
      riser_cable: document.getElementById('riserCable').value === 'true',
      storage: document.getElementById('storage').value ? [document.getElementById('storage').value] : [],
    },
    symptoms: getCheckedValues('symptoms'),
  };
}

function caseMatchesRule(caseData, rule) {
  const { conditions } = rule;
  const symptoms = caseData.symptoms || [];
  const system = caseData.system || {};
  const cooler = (system.cooler || '').toLowerCase();
  const storageType = Array.isArray(system.storage) ? system.storage[0] || '' : '';

  if (conditions.symptoms && !conditions.symptoms.every((symptom) => symptoms.includes(symptom))) return false;
  if (conditions.gpu_present !== undefined && system.gpu_present !== conditions.gpu_present) return false;
  if (conditions.riser_cable !== undefined && system.riser_cable !== conditions.riser_cable) return false;
  if (conditions.ram_modules !== undefined && system.ram_modules !== conditions.ram_modules) return false;
  if (conditions.ram_modules_gte !== undefined && !(system.ram_modules >= conditions.ram_modules_gte)) return false;
  if (conditions.cpu_tier !== undefined && system.cpu !== conditions.cpu_tier) return false;
  if (conditions.storage_type !== undefined && storageType !== conditions.storage_type) return false;
  if (conditions.cooler_keywords && !conditions.cooler_keywords.some((keyword) => cooler.includes(String(keyword).toLowerCase()))) return false;

  return true;
}

function getSuggestions(caseData) {
  const matches = state.rules
    .filter((rule) => caseMatchesRule(caseData, rule))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const causeScores = new Map();
  const stepScores = new Map();

  matches.forEach((rule) => {
    const priority = rule.priority || 0;
    (rule.likely_causes || []).forEach((cause, index) => {
      const weight = Math.max(priority - index * 5, 1);
      causeScores.set(cause, (causeScores.get(cause) || 0) + weight);
    });
    (rule.suggestions || []).forEach((step, index) => {
      const weight = Math.max(priority - index * 3, 1);
      stepScores.set(step, (stepScores.get(step) || 0) + weight);
    });
  });

  const likelyCauses = [...causeScores.entries()].sort((a, b) => b[1] - a[1]).map(([cause]) => cause);
  const suggestions = [...stepScores.entries()].sort((a, b) => b[1] - a[1]).map(([step]) => step);
  const topRule = matches[0] || null;

  let supportingSignal = '';
  if (topRule) {
    if (topRule.conditions?.riser_cable && caseData.system?.riser_cable) {
      supportingSignal = 'This build uses a riser cable, which strongly matches the top diagnostic path.';
    } else if (topRule.conditions?.ram_modules === 4 && caseData.system?.ram_modules === 4) {
      supportingSignal = 'This system uses 4 RAM sticks, which raises memory and board compatibility suspicion.';
    } else if (topRule.conditions?.storage_type && caseData.system?.storage?.[0] === topRule.conditions.storage_type) {
      supportingSignal = `This system is using ${topRule.conditions.storage_type} storage, which matches the strongest path.`;
    } else if (topRule.conditions?.cpu_tier && caseData.system?.cpu === topRule.conditions.cpu_tier) {
      supportingSignal = `The selected CPU tier is ${topRule.conditions.cpu_tier}, which aligns with the top rule.`;
    } else if (caseData.symptoms?.length) {
      supportingSignal = `The selected symptoms most closely match ${topRule.id.replace(/^rule_/, '').replace(/_/g, ' ')}.`;
    }
  }

  return {
    matches,
    primaryCause: likelyCauses[0] || '',
    secondaryCauses: likelyCauses.slice(1, 5),
    recommendedFirstTests: suggestions.slice(0, 4),
    additionalSteps: suggestions.slice(4, 8),
    supportingSignal,
  };
}

function renderSuggestions() {
  const caseData = formToCaseObject();
  const { matches, primaryCause, secondaryCauses, recommendedFirstTests, additionalSteps, supportingSignal } = getSuggestions(caseData);

  els.primaryCause.textContent = primaryCause || 'No primary cause yet';
  els.supportingSignal.textContent = supportingSignal || 'Select symptoms and hardware details to narrow the diagnosis.';
  els.likelyCausesList.innerHTML = '';
  els.nextStepsList.innerHTML = '';
  els.matchedRulesList.innerHTML = '';

  if (!matches.length) {
    els.suggestionsEmpty.classList.remove('hidden');
    els.suggestionsResults.classList.add('hidden');
    return;
  }

  (secondaryCauses.length ? secondaryCauses : ['No additional likely causes yet.']).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.likelyCausesList.appendChild(li);
  });

  recommendedFirstTests.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.nextStepsList.appendChild(li);
  });

  (additionalSteps.length ? additionalSteps : matches.slice(0, 4).map((rule) => rule.id.replace(/^rule_/, '').replace(/_/g, ' '))).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.matchedRulesList.appendChild(li);
  });

  els.suggestionsEmpty.classList.add('hidden');
  els.suggestionsResults.classList.remove('hidden');
}

function buildBoardLogNote() {
  const motherboard = getSelectedOrCustom(els.boardLogMotherboard, els.boardLogMotherboardCustom) || 'Unknown motherboard';
  const issue = els.boardLogIssue.value.trim() || 'No issue entered';
  const fix = els.boardLogFix.value.trim() || 'No fix entered';

  return `Motherboard: ${motherboard}\nIssue: ${issue}\nFix: ${fix}`;
}

async function copyBoardLogNote() {
  const note = buildBoardLogNote();
  try {
    await navigator.clipboard.writeText(note);
    els.boardLogStatus.textContent = 'Copied to clipboard. Paste this into your notes or repo later.';
  } catch (error) {
    els.boardLogStatus.textContent = 'Copy failed in this browser. You can still manually copy the text from the fields.';
  }
}

function clearBoardLog() {
  els.boardLogMotherboard.value = '';
  els.boardLogIssue.value = '';
  els.boardLogFix.value = '';
  toggleCustomField(els.boardLogMotherboard, els.boardLogMotherboardCustom);
  els.boardLogStatus.textContent = 'Nothing copied yet.';
}

async function init() {
  const config = await loadJson('./data/symptoms.json');
  state.symptoms = config.symptoms;
  state.rules = await loadJson('./data/rules.json');
  state.knownProducts = await loadJson('./data/known-products.json');

  populateKnownProductSelect(els.motherboardSelect, state.knownProducts.motherboards || [], 'Select motherboard');
  populateKnownProductSelect(els.boardLogMotherboard, state.knownProducts.motherboards || [], 'Select motherboard');

  createChecklistItems(els.symptomChecklist, state.symptoms, 'symptoms');

  setDefaults();
  clearBoardLog();
  renderSuggestions();

  els.suggestBtn.addEventListener('click', renderSuggestions);
  els.loadSampleBtn.addEventListener('click', loadSample);
  els.resetBtn.addEventListener('click', setDefaults);
  els.copyBoardLogBtn.addEventListener('click', copyBoardLogNote);
  els.clearBoardLogBtn.addEventListener('click', clearBoardLog);
  els.motherboardSelect.addEventListener('change', () => toggleCustomField(els.motherboardSelect, els.motherboardCustom));
  els.boardLogMotherboard.addEventListener('change', () => toggleCustomField(els.boardLogMotherboard, els.boardLogMotherboardCustom));
  els.diagnosticForm.addEventListener('input', renderSuggestions);
}

init().catch((error) => {
  console.error(error);
  els.suggestionsEmpty.textContent = 'Failed to load app data. Check the browser console for details.';
});

const state = {
  symptoms: [],
  troubleshootingSteps: [],
  rules: [],
  cases: [],
  knownProducts: {
    motherboards: [],
    cpus: [],
  },
};

const els = {
  caseForm: document.getElementById('caseForm'),
  symptomChecklist: document.getElementById('symptomChecklist'),
  troubleshootingChecklist: document.getElementById('troubleshootingChecklist'),
  suggestBtn: document.getElementById('suggestBtn'),
  exportBtn: document.getElementById('exportBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  newCaseBtn: document.getElementById('newCaseBtn'),
  suggestionsEmpty: document.getElementById('suggestionsEmpty'),
  suggestionsResults: document.getElementById('suggestionsResults'),
  diagnosisSummary: document.getElementById('diagnosisSummary'),
  primaryCause: document.getElementById('primaryCause'),
  supportingSignal: document.getElementById('supportingSignal'),
  likelyCausesList: document.getElementById('likelyCausesList'),
  nextStepsList: document.getElementById('nextStepsList'),
  matchedRulesList: document.getElementById('matchedRulesList'),
  caseHistoryEmpty: document.getElementById('caseHistoryEmpty'),
  caseHistoryList: document.getElementById('caseHistoryList'),
  caseSearch: document.getElementById('caseSearch'),
  historyCardTemplate: document.getElementById('historyCardTemplate'),
  caseStatus: document.getElementById('caseStatus'),
  motherboardSelect: document.getElementById('motherboardSelect'),
  motherboardCustom: document.getElementById('motherboardCustom'),
  cpuSelect: document.getElementById('cpuSelect'),
  cpuCustom: document.getElementById('cpuCustom'),
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function setDefaults() {
  document.getElementById('dateCreated').value = todayString();
  document.getElementById('caseId').value = generateCaseId();
  els.motherboardSelect.value = '';
  els.cpuSelect.value = '';
  toggleCustomField(els.motherboardSelect, els.motherboardCustom);
  toggleCustomField(els.cpuSelect, els.cpuCustom);
}

function generateCaseId() {
  const next = state.cases.length + 1;
  return `CASE-${String(next).padStart(4, '0')}`;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
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
  if (!isCustom) {
    inputEl.value = '';
  }
}

function getSelectedOrCustom(selectEl, inputEl) {
  if (selectEl.value === '__custom__') {
    return inputEl.value.trim();
  }
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

function parseStorage(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function formToCaseObject() {
  const gpuPresent = document.getElementById('gpuPresent').value === 'true';
  const riserCable = document.getElementById('riserCable').value === 'true';
  const resolved = document.getElementById('resolved').value === 'true';

  return {
    case_id: document.getElementById('caseId').value.trim(),
    date_created: document.getElementById('dateCreated').value || todayString(),
    csr: document.getElementById('csr').value.trim(),
    customer_reference: document.getElementById('customerReference').value.trim(),
    system: {
      motherboard: getSelectedOrCustom(els.motherboardSelect, els.motherboardCustom),
      cpu: getSelectedOrCustom(els.cpuSelect, els.cpuCustom),
      cooler: document.getElementById('cooler').value.trim(),
      ram_total_gb: Number(document.getElementById('ramTotalGb').value || 0),
      ram_modules: Number(document.getElementById('ramModules').value || 0),
      gpu_present: gpuPresent,
      gpu_model: document.getElementById('gpuModel').value.trim(),
      riser_cable: riserCable,
      storage: parseStorage(document.getElementById('storage').value),
    },
    symptoms: getCheckedValues('symptoms'),
    symptom_details: {
      when_it_happens: document.getElementById('whenItHappens').value.trim(),
      frequency: document.getElementById('frequency').value.trim(),
      recent_changes: document.getElementById('recentChanges').value.trim(),
      notes: document.getElementById('notes').value.trim(),
    },
    troubleshooting_done: getCheckedValues('troubleshooting'),
    resolution: {
      resolved,
      probable_cause: document.getElementById('probableCause').value.trim(),
      confirmed_cause: document.getElementById('confirmedCause').value.trim(),
      fix_performed: document.getElementById('fixPerformed').value.trim(),
      final_notes: document.getElementById('finalNotes').value.trim(),
    },
  };
}

function caseMatchesRule(caseData, rule) {
  const { conditions } = rule;
  const symptoms = caseData.symptoms || [];
  const troubleshooting = caseData.troubleshooting_done || [];
  const system = caseData.system || {};
  const details = caseData.symptom_details || {};

  if (conditions.symptoms && !conditions.symptoms.every((symptom) => symptoms.includes(symptom))) {
    return false;
  }
  if (conditions.gpu_present !== undefined && system.gpu_present !== conditions.gpu_present) {
    return false;
  }
  if (conditions.riser_cable !== undefined && system.riser_cable !== conditions.riser_cable) {
    return false;
  }
  if (conditions.ram_modules !== undefined && system.ram_modules !== conditions.ram_modules) {
    return false;
  }
  if (conditions.ram_modules_gte !== undefined && !(system.ram_modules >= conditions.ram_modules_gte)) {
    return false;
  }
  if (conditions.recent_changes_includes) {
    const haystack = (details.recent_changes || '').toLowerCase();
    if (!haystack.includes(conditions.recent_changes_includes.toLowerCase())) return false;
  }
  if (conditions.when_it_happens_includes) {
    const haystack = (details.when_it_happens || '').toLowerCase();
    if (!haystack.includes(conditions.when_it_happens_includes.toLowerCase())) return false;
  }
  if (conditions.troubleshooting_missing) {
    if (troubleshooting.includes(conditions.troubleshooting_missing)) return false;
  }

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

  const likelyCauses = [...causeScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cause]) => cause);

  const suggestions = [...stepScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([step]) => step);

  const primaryCause = likelyCauses[0] || '';
  const secondaryCauses = likelyCauses.slice(1, 5);
  const recommendedFirstTests = suggestions.slice(0, 4);
  const topRule = matches[0] || null;
  let supportingSignal = '';

  if (topRule) {
    if (topRule.conditions?.riser_cable && caseData.system?.riser_cable) {
      supportingSignal = 'Riser cable is part of this build and matches the top rule.';
    } else if (topRule.conditions?.ram_modules_gte && caseData.system?.ram_modules >= topRule.conditions.ram_modules_gte) {
      supportingSignal = `This case has ${caseData.system.ram_modules} RAM sticks, which matches the strongest memory rule.`;
    } else if (topRule.conditions?.recent_changes_includes) {
      supportingSignal = `Recent changes mention ${topRule.conditions.recent_changes_includes}, which points toward this path first.`;
    } else if (topRule.conditions?.when_it_happens_includes) {
      supportingSignal = `The issue timing mentions ${topRule.conditions.when_it_happens_includes}, which lines up with the top rule.`;
    } else if (caseData.symptoms?.length) {
      supportingSignal = `The selected symptoms best match ${topRule.id.replace(/^rule_/, '').replace(/_/g, ' ')}.`;
    }
  }

  return { matches, likelyCauses, suggestions, primaryCause, secondaryCauses, recommendedFirstTests, supportingSignal };
}

function renderSuggestions() {
  const caseData = formToCaseObject();
  const { matches, suggestions, primaryCause, secondaryCauses, recommendedFirstTests, supportingSignal } = getSuggestions(caseData);

  els.primaryCause.textContent = primaryCause || 'No primary cause yet';
  els.supportingSignal.textContent = supportingSignal || 'Add more symptom details or troubleshooting steps to tighten the diagnosis.';
  els.likelyCausesList.innerHTML = '';
  els.nextStepsList.innerHTML = '';
  els.matchedRulesList.innerHTML = '';

  if (!matches.length) {
    els.suggestionsEmpty.classList.remove('hidden');
    els.suggestionsResults.classList.add('hidden');
    return;
  }

  secondaryCauses.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.likelyCausesList.appendChild(li);
  });

  if (!secondaryCauses.length) {
    const li = document.createElement('li');
    li.textContent = 'No additional likely causes yet.';
    els.likelyCausesList.appendChild(li);
  }

  recommendedFirstTests.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.nextStepsList.appendChild(li);
  });

  suggestions.slice(4, 8).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    els.matchedRulesList.appendChild(li);
  });

  if (!suggestions.slice(4, 8).length) {
    matches.slice(0, 4).forEach((rule) => {
      const li = document.createElement('li');
      li.textContent = `${rule.id.replace(/^rule_/, '').replace(/_/g, ' ')} (${rule.priority || 0})`;
      els.matchedRulesList.appendChild(li);
    });
  }

  els.suggestionsEmpty.classList.add('hidden');
  els.suggestionsResults.classList.remove('hidden');
}

function exportJson() {
  const caseData = formToCaseObject();
  const { likelyCauses } = getSuggestions(caseData);
  caseData.suggested_causes = likelyCauses;

  const blob = new Blob([JSON.stringify(caseData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${caseData.case_id || 'case-export'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function fillForm(caseData) {
  document.getElementById('caseId').value = caseData.case_id || '';
  document.getElementById('dateCreated').value = caseData.date_created || todayString();
  document.getElementById('csr').value = caseData.csr || '';
  document.getElementById('customerReference').value = caseData.customer_reference || '';
  setSelectOrCustom(els.motherboardSelect, els.motherboardCustom, caseData.system?.motherboard || '');
  setSelectOrCustom(els.cpuSelect, els.cpuCustom, caseData.system?.cpu || '');
  document.getElementById('cooler').value = caseData.system?.cooler || '';
  document.getElementById('ramTotalGb').value = caseData.system?.ram_total_gb || '';
  document.getElementById('ramModules').value = caseData.system?.ram_modules || '';
  document.getElementById('gpuPresent').value = String(Boolean(caseData.system?.gpu_present));
  document.getElementById('gpuModel').value = caseData.system?.gpu_model || '';
  document.getElementById('riserCable').value = String(Boolean(caseData.system?.riser_cable));
  document.getElementById('storage').value = (caseData.system?.storage || []).join(', ');
  document.getElementById('whenItHappens').value = caseData.symptom_details?.when_it_happens || '';
  document.getElementById('frequency').value = caseData.symptom_details?.frequency || '';
  document.getElementById('recentChanges').value = caseData.symptom_details?.recent_changes || '';
  document.getElementById('notes').value = caseData.symptom_details?.notes || '';
  document.getElementById('probableCause').value = caseData.resolution?.probable_cause || '';
  document.getElementById('confirmedCause').value = caseData.resolution?.confirmed_cause || '';
  document.getElementById('fixPerformed').value = caseData.resolution?.fix_performed || '';
  document.getElementById('resolved').value = String(Boolean(caseData.resolution?.resolved));
  document.getElementById('finalNotes').value = caseData.resolution?.final_notes || '';

  document.querySelectorAll('input[name="symptoms"]').forEach((input) => {
    input.checked = (caseData.symptoms || []).includes(input.value);
  });
  document.querySelectorAll('input[name="troubleshooting"]').forEach((input) => {
    input.checked = (caseData.troubleshooting_done || []).includes(input.value);
  });

  els.caseStatus.textContent = caseData.resolution?.resolved ? 'Resolved' : 'Draft';
  renderSuggestions();
}

function clearForm() {
  els.caseForm.reset();
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => input.checked = false);
  setDefaults();
  els.caseStatus.textContent = 'Draft';
  renderSuggestions();
}

function caseToSearchText(caseData) {
  return [
    caseData.case_id,
    caseData.customer_reference,
    caseData.csr,
    caseData.system?.motherboard,
    caseData.system?.cpu,
    caseData.system?.gpu_model,
    ...(caseData.symptoms || []),
    caseData.resolution?.probable_cause,
    caseData.resolution?.confirmed_cause,
    caseData.resolution?.fix_performed,
  ].join(' ').toLowerCase();
}

function renderCaseHistory(filter = '') {
  const query = filter.trim().toLowerCase();
  const filtered = !query
    ? state.cases
    : state.cases.filter((caseData) => caseToSearchText(caseData).includes(query));

  els.caseHistoryList.innerHTML = '';

  if (!filtered.length) {
    els.caseHistoryEmpty.textContent = 'No matching cases found.';
    els.caseHistoryEmpty.classList.remove('hidden');
    return;
  }

  els.caseHistoryEmpty.classList.add('hidden');

  filtered.forEach((caseData) => {
    const fragment = els.historyCardTemplate.content.cloneNode(true);
    fragment.querySelector('.history-title').textContent = `${caseData.case_id} • ${caseData.system?.motherboard || 'Unknown board'}`;
    fragment.querySelector('.history-meta').textContent = `${caseData.date_created || ''} • ${caseData.csr || 'Unknown CSR'} • ${caseData.customer_reference || 'No order #'}`;
    fragment.querySelector('.history-summary').textContent = `${(caseData.symptoms || []).join(', ') || 'No symptoms'} • ${caseData.resolution?.confirmed_cause || caseData.resolution?.probable_cause || 'No cause logged yet'}`;

    const resolvedBadge = fragment.querySelector('.history-resolved');
    resolvedBadge.textContent = caseData.resolution?.resolved ? 'Resolved' : 'Open';
    resolvedBadge.style.color = caseData.resolution?.resolved ? 'var(--accent)' : 'var(--warning)';

    const tagContainer = fragment.querySelector('.history-tags');
    (caseData.symptoms || []).slice(0, 4).forEach((item) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = item;
      tagContainer.appendChild(tag);
    });

    const card = fragment.querySelector('.history-card');
    card.addEventListener('click', () => fillForm(caseData));
    card.style.cursor = 'pointer';

    els.caseHistoryList.appendChild(fragment);
  });
}

async function init() {
  const config = await loadJson('./data/symptoms.json');
  state.symptoms = config.symptoms;
  state.troubleshootingSteps = config.troubleshooting_steps;
  state.rules = await loadJson('./data/rules.json');
  state.knownProducts = await loadJson('./data/known-products.json');

  populateKnownProductSelect(els.motherboardSelect, state.knownProducts.motherboards || [], 'Select motherboard');
  populateKnownProductSelect(els.cpuSelect, state.knownProducts.cpus || [], 'Select CPU');

  createChecklistItems(els.symptomChecklist, state.symptoms, 'symptoms');
  createChecklistItems(els.troubleshootingChecklist, state.troubleshootingSteps, 'troubleshooting');

  const sampleCase = await loadJson('./data/cases/CASE-0001.json');
  state.cases = [sampleCase];

  setDefaults();
  renderCaseHistory();
  renderSuggestions();

  els.suggestBtn.addEventListener('click', renderSuggestions);
  els.exportBtn.addEventListener('click', exportJson);
  els.loadSampleBtn.addEventListener('click', () => fillForm(sampleCase));
  els.newCaseBtn.addEventListener('click', clearForm);
  els.caseSearch.addEventListener('input', (event) => renderCaseHistory(event.target.value));
  els.motherboardSelect.addEventListener('change', () => toggleCustomField(els.motherboardSelect, els.motherboardCustom));
  els.cpuSelect.addEventListener('change', () => toggleCustomField(els.cpuSelect, els.cpuCustom));
  els.caseForm.addEventListener('input', () => {
    els.caseStatus.textContent = document.getElementById('resolved').value === 'true' ? 'Resolved' : 'Draft';
  });
}

init().catch((error) => {
  console.error(error);
  els.caseHistoryEmpty.textContent = 'Failed to load app data. Check the browser console for details.';
});

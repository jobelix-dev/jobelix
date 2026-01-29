/**
 * YAML Converter Utility
 * Converts work preferences to YAML format for bot configuration
 * Saves to repository root for Electron app usage
 */

interface WorkPreferences {
  remote_work: boolean;
  exp_internship: boolean;
  exp_entry: boolean;
  exp_associate: boolean;
  exp_mid_senior: boolean;
  exp_director: boolean;
  exp_executive: boolean;
  job_full_time: boolean;
  job_part_time: boolean;
  job_contract: boolean;
  job_temporary: boolean;
  job_internship: boolean;
  job_volunteer: boolean;
  job_other: boolean;
  date_24_hours: boolean;
  date_week: boolean;
  date_month: boolean;
  date_all_time: boolean;
  positions: string[];
  locations: string[];
  company_blacklist: string[];
  title_blacklist: string[];
  date_of_birth: string;
  pronouns: string;
  gender: string;
  is_veteran: boolean;
  has_disability: boolean;
  ethnicity: string;
  eu_work_authorization: boolean;
  us_work_authorization: boolean;
  in_person_work: boolean;
  open_to_relocation: boolean;
  willing_to_complete_assessments: boolean;
  willing_to_undergo_drug_tests: boolean;
  willing_to_undergo_background_checks: boolean;
  notice_period: string;
  salary_expectation_usd: number;
}

/**
 * Converts preferences object to YAML string
 */
export function preferencesToYAML(prefs: WorkPreferences): string {
  const yaml: string[] = [];

  // Remote work filter is disabled - it limits job results too much
  // Bot now searches all jobs (on-site, hybrid, remote) by default
  yaml.push(`remote: false`);
  yaml.push('');

  // Experience levels
  yaml.push('experienceLevel:');
  yaml.push(`  internship: ${prefs.exp_internship}`);
  yaml.push(`  entry: ${prefs.exp_entry}`);
  yaml.push(`  associate: ${prefs.exp_associate}`);
  yaml.push(`  mid-senior level: ${prefs.exp_mid_senior}`);
  yaml.push(`  director: ${prefs.exp_director}`);
  yaml.push(`  executive: ${prefs.exp_executive}`);
  yaml.push('');

  // Job types
  yaml.push('jobTypes:');
  yaml.push(`  full-time: ${prefs.job_full_time}`);
  yaml.push(`  contract: ${prefs.job_contract}`);
  yaml.push(`  part-time: ${prefs.job_part_time}`);
  yaml.push(`  temporary: ${prefs.job_temporary}`);
  yaml.push(`  internship: ${prefs.job_internship}`);
  yaml.push(`  other: ${prefs.job_other}`);
  yaml.push(`  volunteer: ${prefs.job_volunteer}`);
  yaml.push('');

  // Date filters
  yaml.push('date:');
  yaml.push(`  all time: ${prefs.date_all_time}`);
  yaml.push(`  month: ${prefs.date_month}`);
  yaml.push(`  week: ${prefs.date_week}`);
  yaml.push(`  24 hours: ${prefs.date_24_hours}`);
  yaml.push('');

  // Positions
  yaml.push('positions:');
  if (prefs.positions.length === 0) {
    yaml.push('  []');
  } else {
    prefs.positions.forEach(position => {
      yaml.push(`  - ${position}`);
    });
  }
  yaml.push('');

  // Locations
  yaml.push('locations:');
  if (prefs.locations.length === 0) {
    yaml.push('  []');
  } else {
    prefs.locations.forEach(location => {
      yaml.push(`  - ${location}`);
    });
  }
  yaml.push('');

  // Distance (fixed at 0 as per requirements)
  yaml.push('distance: 0');
  yaml.push('');

  // Company blacklist
  yaml.push('companyBlacklist:');
  if (prefs.company_blacklist.length === 0) {
    yaml.push('  []');
  } else {
    prefs.company_blacklist.forEach(company => {
      yaml.push(`  - ${company}`);
    });
  }
  yaml.push('');

  // Title blacklist
  yaml.push('titleBlacklist:');
  if (prefs.title_blacklist.length === 0) {
    yaml.push('  []');
  } else {
    prefs.title_blacklist.forEach(title => {
      yaml.push(`  - ${title}`);
    });
  }
  yaml.push('');

  // Bot-specific resume configuration
  yaml.push('# Bot-specific resume configuration');
  yaml.push('resume_config:');
  
  // Personal details
  yaml.push('  personal_details:');
  yaml.push(`    date_of_birth: "${prefs.date_of_birth}"`);
  yaml.push(`    pronouns: "${prefs.pronouns}"`);
  yaml.push(`    gender: "${prefs.gender}"`);
  yaml.push(`    veteran: ${prefs.is_veteran}`);
  yaml.push(`    disability: ${prefs.has_disability}`);
  yaml.push(`    ethnicity: "${prefs.ethnicity}"`);
  yaml.push('  ');

  // Legal authorization
  yaml.push('  legal_authorization:');
  yaml.push('    # Work authorization (primary fields - required)');
  yaml.push(`    eu_work_authorization: ${prefs.eu_work_authorization}   # EU citizen/permanent resident`);
  yaml.push(`    us_work_authorization: ${prefs.us_work_authorization}  # ${prefs.us_work_authorization ? 'Authorized to work in US' : 'Not authorized to work in US'}`);
  yaml.push('    ');
  yaml.push('    # Visa/sponsorship requirements (optional - auto-derived if not specified)');
  yaml.push('    # Only specify these if you want to override the automatic logic');
  yaml.push('    # Auto-logic: if you have authorization → no visa/sponsorship needed');
  yaml.push('    #             if you don\'t have authorization → visa/sponsorship needed');
  yaml.push('    # requires_us_visa: true          # Uncomment to override (default: true if us_work_authorization=false)');
  yaml.push('    # requires_us_sponsorship: true   # Uncomment to override (default: true if us_work_authorization=false)');
  yaml.push('  ');

  // Work preferences
  yaml.push('  work_preferences:');
  yaml.push(`    remote_work: ${prefs.remote_work}`);
  yaml.push(`    in_person_work: ${prefs.in_person_work}`);
  yaml.push(`    open_to_relocation: ${prefs.open_to_relocation}`);
  yaml.push(`    willing_to_complete_assessments: ${prefs.willing_to_complete_assessments}`);
  yaml.push(`    willing_to_undergo_drug_tests: ${prefs.willing_to_undergo_drug_tests}`);
  yaml.push(`    willing_to_undergo_background_checks: ${prefs.willing_to_undergo_background_checks}`);
  yaml.push('  ');

  // Availability
  yaml.push('  availability:');
  yaml.push(`    notice_period: "${prefs.notice_period}"`);
  yaml.push('  ');

  // Salary expectations
  yaml.push('  salary_expectations:');
  yaml.push(`    salary_expectation_usd: "${prefs.salary_expectation_usd}"`);

  return yaml.join('\n');
}

/**
 * Saves YAML content to repository root via API
 */
export async function saveYAMLToRepo(preferences: WorkPreferences): Promise<void> {
  const yamlContent = preferencesToYAML(preferences);
  
  // Check if we're in Electron environment
  if (typeof window !== 'undefined' && window.electronAPI) {
    // Use Electron IPC for local file access (secure, stays local)
    console.log('Saving YAML locally via Electron IPC...');
    const result = await window.electronAPI.writeConfigFile(yamlContent);
    
    if (!result.success) {
      throw new Error(`Failed to save config.yaml: ${result.error || 'Unknown error'}`);
    }
    
    console.log('config.yaml saved locally via Electron IPC');
    return;
  }

  // Fallback to API route for non-Electron environments (development browser)
  console.log('Sending YAML to API...');
  const response = await fetch('/api/student/work-preferences/export-yaml', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yamlContent }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('API error:', errorData);
    throw new Error(`Failed to save config.yaml: ${errorData.error || response.statusText}`);
  }

  const result = await response.json();
  console.log('YAML saved to:', result.path);
}

/**
 * Converts preferences to YAML and saves to repo root
 */
export async function exportPreferencesToYAML(preferences: WorkPreferences): Promise<void> {
  await saveYAMLToRepo(preferences);
}

/**
 * Secrets Loader Utility
 * Client-side file reading for Electron app via IPC
 */

interface LinkedInCredentials {
  email: string;
  password: string;
}

export async function loadLinkedInCredentials(): Promise<LinkedInCredentials> {
  try {
    // Check if we're in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.log('Not in Electron environment, skipping credentials load');
      return { email: '', password: '' };
    }

    console.log('Loading credentials via Electron IPC...');

    // Use Electron IPC to read secrets file
    const result = await window.electronAPI.readSecretsFile();

    if (result.success) {
      console.log('LinkedIn credentials loaded successfully');
      return {
        email: result.email,
        password: result.password,
      };
    } else {
      console.log('No secrets file found');
      return { email: '', password: '' };
    }
  } catch (error) {
    console.error('Error loading credentials:', error);
    return { email: '', password: '' };
  }
}

export async function saveLinkedInCredentials(email: string, password: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.error('Not in Electron environment');
      return false;
    }

    const yamlContent = `email: "${email}"\npassword: "${password}"`;
    const result = await window.electronAPI.writeSecretsFile(yamlContent);

    return result.success;
  } catch (error) {
    console.error('Error saving credentials:', error);
    return false;
  }
}

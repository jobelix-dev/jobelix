import { SignupPayload, SignupResponse, UserProfile, CompanyOffer } from './types';

const MOCK_PREFIX = '/api/mock';
const REAL_PREFIX = '/api';

function basePath() {
  return process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ? MOCK_PREFIX : REAL_PREFIX;
}

async function handleJSONResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  const res = await fetch(`${basePath()}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await handleJSONResponse(res);
  return data as SignupResponse;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${basePath()}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleJSONResponse(res);
  return data;
}

export async function getProfile(): Promise<UserProfile | null> {
  const res = await fetch(`${basePath()}/profile`);
  if (!res.ok) return null;
  return (await res.json()) as UserProfile;
}

export async function listOffers(): Promise<CompanyOffer[]> {
  const res = await fetch(`${basePath()}/offers`);
  if (!res.ok) return [];
  return (await res.json()) as CompanyOffer[];
}

export async function createOffer(payload: { title: string; description?: string }) {
  const res = await fetch(`${basePath()}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJSONResponse(res);
}

// Placeholder for upload — frontend can call this which will route to mock or real API.
export async function uploadResume(formData: FormData) {
  const res = await fetch(`${basePath()}/resume`, {
    method: 'POST',
    body: formData,
  });
  return handleJSONResponse(res);
}

export default { signup, login, getProfile, listOffers, createOffer, uploadResume };

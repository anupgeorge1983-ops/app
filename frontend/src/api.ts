// Backend API client for Be Heard

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type Submission = { raw: string; mirror: string; confirmed: boolean };
export type Verdict = {
  pill: "Proportionate" | "Heightened";
  summary: string;
  did_well: string;
  could_differently: string;
  action: string;
};
export type Case = {
  id: string;
  user_id: string;
  title: string;
  partner_a_name: string;
  partner_b_name: string;
  stage: string;
  status: string;
  a_r1: Submission;
  a_r2: Submission;
  a_r3: Submission;
  b_r1: Submission;
  b_r2: Submission;
  b_r3: Submission;
  a_r2_question: string;
  b_r2_question: string;
  a_r3_question: string;
  b_r3_question: string;
  a_verdict: Verdict | null;
  b_verdict: Verdict | null;
  created_at: string;
  updated_at: string;
};
export type Profile = {
  user_id: string;
  name: string;
  partner_name: string;
  mode: "quick" | "full";
  answers: { question: string; answer: string }[];
  conflict_style: string[];
  created_at: string;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  upsertProfile: (body: {
    user_id?: string;
    name: string;
    partner_name?: string;
    mode: "quick" | "full";
    answers: { question: string; answer: string }[];
  }) => req<Profile>("/profile", { method: "POST", body: JSON.stringify(body) }),
  getProfile: (user_id: string) => req<Profile>(`/profile/${user_id}`),
  createCase: (body: {
    user_id: string;
    title: string;
    partner_a_name: string;
    partner_b_name: string;
  }) => req<Case>("/cases", { method: "POST", body: JSON.stringify(body) }),
  getCase: (id: string) => req<Case>(`/cases/${id}`),
  listCases: (user_id: string) => req<Case[]>(`/cases?user_id=${encodeURIComponent(user_id)}`),
  submit: (
    id: string,
    body: { partner: "a" | "b"; round: 1 | 2 | 3; text: string },
  ) => req<Case>(`/cases/${id}/submit`, { method: "POST", body: JSON.stringify(body) }),
  confirmMirror: (
    id: string,
    body: {
      partner: "a" | "b";
      round: 1 | 2 | 3;
      action: "confirm" | "adjust";
      adjusted_text?: string;
    },
  ) => req<Case>(`/cases/${id}/confirm-mirror`, {
    method: "POST",
    body: JSON.stringify(body),
  }),
  getStats: (user_id: string) =>
    req<{
      total_cases: number;
      total_resolved: number;
      my_cases: number;
      my_resolved: number;
      my_in_progress: number;
    }>(`/stats?user_id=${encodeURIComponent(user_id)}`),
  transcribe: async (
    uri: string,
    mimeType: string = "audio/m4a",
    filename: string = "audio.m4a",
  ): Promise<{ text: string }> => {
    const form = new FormData();
    // React Native FormData accepts { uri, name, type } objects
    form.append("file", { uri, name: filename, type: mimeType } as any);
    const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: form });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Transcribe ${res.status}: ${t || res.statusText}`);
    }
    return res.json();
  },
};

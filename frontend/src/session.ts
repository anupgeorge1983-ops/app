import { storage } from "@/src/utils/storage";

const USER_KEY = "be_heard_user_id";
const ONBOARDED_KEY = "be_heard_onboarded";
const NAME_KEY = "be_heard_user_name";
const PARTNER_KEY = "be_heard_partner_name";

function genId() {
  // tiny uuid-v4ish
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateUserId(): Promise<string> {
  const existing = await storage.getItem<string>(USER_KEY, "");
  if (existing && typeof existing === "string" && existing.length > 0) {
    return existing;
  }
  const id = genId();
  await storage.setItem(USER_KEY, id);
  return id;
}

export async function setOnboarded(name: string, partner: string) {
  await storage.setItem(ONBOARDED_KEY, true);
  await storage.setItem(NAME_KEY, name);
  await storage.setItem(PARTNER_KEY, partner);
}

export async function isOnboarded(): Promise<boolean> {
  const v = await storage.getItem<boolean>(ONBOARDED_KEY, false);
  return v === true;
}

export async function getUserNames(): Promise<{ name: string; partner: string }> {
  const name = (await storage.getItem<string>(NAME_KEY, "")) || "";
  const partner = (await storage.getItem<string>(PARTNER_KEY, "")) || "";
  return { name, partner };
}

export async function resetSession() {
  await storage.removeItem(ONBOARDED_KEY);
  await storage.removeItem(NAME_KEY);
  await storage.removeItem(PARTNER_KEY);
}

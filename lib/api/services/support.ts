import { apiGet, apiPost } from '../client';
import type { ApiResource } from '../types';

export type SupportRequestType = 'staff' | 'issue' | 'support';

export interface HelpTopic {
  id: number;
  question: string;
  answer?: string;
  category: string;
}

/** Active session services — call staff to seat, report issue, etc. */
export async function callStaff(message?: string): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/services/call-staff', {
    message,
  });
  return res.data;
}

export async function reportIssue(body: { type: 'tech' | 'complaint'; message: string }): Promise<{ ok: boolean }> {
  const res = await apiPost<ApiResource<{ ok: boolean }>>('/mobile/services/report', body);
  return res.data;
}

/** Help-support FAQ topics. */
export async function listHelpTopics(): Promise<HelpTopic[]> {
  const res = await apiGet<ApiResource<HelpTopic[]>>('/mobile/help/topics');
  return res.data;
}

export async function submitSupportTicket(body: {
  subject: string;
  message: string;
}): Promise<{ ok: boolean; ticket_id?: number }> {
  const res = await apiPost<ApiResource<{ ok: boolean; ticket_id?: number }>>(
    '/mobile/help/tickets',
    body,
  );
  return res.data;
}

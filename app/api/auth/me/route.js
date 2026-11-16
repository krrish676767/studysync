import { handler, json, requireUser } from '@/lib/api';

export const GET = handler(async () => json({ user: await requireUser() }));

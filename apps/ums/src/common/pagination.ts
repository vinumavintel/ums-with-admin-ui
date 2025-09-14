import { Prisma } from '@prisma/client';

export interface PaginateOptions { page?: number; limit?: number }
export interface PaginatedResult<T> { items: T[]; total: number; page: number; limit: number; pageCount: number }

/** Generic paginator given a query function returning [items,total]. */
export async function paginate<T>(queryFn: (skip: number, take: number) => Promise<[T[], number]>, opts: PaginateOptions = {}): Promise<PaginatedResult<T>> {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 20;
  const skip = (page - 1) * limit;
  const [items, total] = await queryFn(skip, limit);
  const pageCount = Math.ceil(total / limit) || 1;
  return { items, total, page, limit, pageCount };
}

/** Build a user search where clause for email/first/last containing q (case-insensitive). */
export function buildUserSearchWhere(q?: string) {
  if (!q) return {};
  return {
    OR: [
      { email: { contains: q, mode: 'insensitive' as const } },
      { firstName: { contains: q, mode: 'insensitive' as const } },
      { lastName: { contains: q, mode: 'insensitive' as const } },
    ],
  } satisfies Prisma.UserWhereInput;
}

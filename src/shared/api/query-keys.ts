export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: () => [...queryKeys.events.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
    rates: (eventId: string) => [...queryKeys.events.all, 'rates', eventId] as const,
    categoryTotals: (eventId: string) => [...queryKeys.events.all, 'categoryTotals', eventId] as const,
  },
  members: {
    all: ['members'] as const,
    list: (filters?: { search?: string; dateStart?: string; dateEnd?: string }) =>
      [...queryKeys.members.all, 'list', filters] as const,
    earnings: (id: string) => [...queryKeys.members.all, 'earnings', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  deposits: {
    all: ['deposits'] as const,
    byEvent: (eventId: string) => [...queryKeys.deposits.all, 'event', eventId] as const,
    detail: (id: string) => [...queryKeys.deposits.all, 'detail', id] as const,
  },
  dashboard: {
    stats: (dateStart?: string, dateEnd?: string) =>
      ['dashboard', 'stats', dateStart, dateEnd] as const,
    breakdown: (dateStart?: string, dateEnd?: string) =>
      ['dashboard', 'breakdown', dateStart, dateEnd] as const,
  },
  vendors: {
    all: ['vendors'] as const,
  },
  manifests: {
    all: ['manifests'] as const,
    byEvent: (eventId: string) => [...queryKeys.manifests.all, 'event', eventId] as const,
  },
};

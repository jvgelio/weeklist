import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../lib/api'
import type { Tag } from '../lib/types'

export const tagKeys = {
  all: () => ['tags'] as const,
}

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all(),
    queryFn: ({ signal }) => api.fetchTags(signal),
    staleTime: 60_000,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => api.createTag(data),
    onSuccess: (newTag) => {
      qc.setQueryData<Tag[]>(tagKeys.all(), (old = []) => [...old, newTag])
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      api.updateTag(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: tagKeys.all() })
      const snapshot = qc.getQueryData<Tag[]>(tagKeys.all())
      qc.setQueryData<Tag[]>(tagKeys.all(), (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...data } : t))
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.all(), ctx.snapshot)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tagKeys.all() }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: tagKeys.all() })
      const snapshot = qc.getQueryData<Tag[]>(tagKeys.all())
      qc.setQueryData<Tag[]>(tagKeys.all(), (old = []) => old.filter((t) => t.id !== id))
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.all(), ctx.snapshot)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all() })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

import { z } from 'zod'

export const noteSchema = z.object({
  title: z.string().max(200).optional().transform(v => v?.trim() || undefined),
  content: z.string().min(1, 'Conteúdo obrigatório').max(50_000).transform(v => v.trim()),
  visibility: z.enum(['PRIVATE', 'CAMPAIGN', 'GM_ONLY']).default('PRIVATE'),
})

export const handoutSchema = z.object({
  title:    z.string().max(200).optional().transform(v => v?.trim() || undefined),
  content:  z.string().max(50_000).optional().transform(v => v?.trim() || undefined),
  imageUrl: z.string().max(2048).optional(),
}).refine(d => d.title || d.content || d.imageUrl, {
  message: 'Handout deve ter título, conteúdo ou imagem',
})

export const applySchema = z.object({
  characterDesc:   z.string().max(1_000).default('').transform(v => v.trim()),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
})

export const summarySchema = z.object({
  content: z.string().min(1, 'Conteúdo obrigatório').max(10_000).transform(v => v.trim()),
})

export type NoteInput     = z.infer<typeof noteSchema>
export type HandoutInput  = z.infer<typeof handoutSchema>
export type ApplyInput    = z.infer<typeof applySchema>
export type SummaryInput  = z.infer<typeof summarySchema>

export function parseBody<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
): { success: true; data: z.output<S> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.errors[0]
    return { success: false, error: first?.message ?? 'Dados inválidos' }
  }
  return { success: true, data: result.data as z.output<S> }
}

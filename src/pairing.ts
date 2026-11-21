interface NamedFile {
  name: string
}

export type Side = 'before' | 'after'

export interface Pair<T extends NamedFile> {
  name: string
  before: T
  after: T
}

function stem(name: string) {
  return name.replace(/\.(png|jpe?g|webp)$/i, '') || name
}

function groupByStem<T extends NamedFile>(files: readonly T[]) {
  const groups = new Map<string, T[]>()
  for (const file of files) {
    const name = stem(file.name).toLowerCase()
    const group = groups.get(name) ?? []
    group.push(file)
    groups.set(name, group)
  }
  return groups
}

export function matchScreenshots<T extends NamedFile>(
  before: readonly T[], after: readonly T[], allowDifferentNames = false,
) {
  const pairs: Pair<T>[] = []
  const unmatched: { side: Side; file: T }[] = []

  if (allowDifferentNames && before.length === 1 && after.length === 1) {
    pairs.push({ name: stem(before[0].name), before: before[0], after: after[0] })
    return { pairs, unmatched }
  }

  const beforeGroups = groupByStem(before)
  const afterGroups = groupByStem(after)
  const matched = new Set<T>()
  for (const [key, beforeFiles] of beforeGroups) {
    const afterFiles = afterGroups.get(key)
    if (beforeFiles.length !== 1 || afterFiles?.length !== 1) continue
    const [beforeFile] = beforeFiles
    const [afterFile] = afterFiles
    pairs.push({ name: stem(beforeFile.name), before: beforeFile, after: afterFile })
    matched.add(beforeFile)
    matched.add(afterFile)
  }

  for (const file of before) {
    if (!matched.has(file)) unmatched.push({ side: 'before', file })
  }
  for (const file of after) {
    if (!matched.has(file)) unmatched.push({ side: 'after', file })
  }
  return { pairs, unmatched }
}

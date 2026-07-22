import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import ts from 'typescript'

const sourceRoot = resolve('src')
const cataloguePath = resolve(sourceRoot, 'i18n', 'pt-PT.ts')

async function listSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listSources(path))
    else if (['.ts', '.tsx'].includes(extname(entry.name))) files.push(path)
  }
  return files
}

function literalText(node) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  return null
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text
  }
  return null
}

const catalogueSource = ts.createSourceFile(
  cataloguePath,
  await readFile(cataloguePath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)

const catalogueKeys = new Set()
const duplicateKeys = new Set()

function collectCatalogue(node) {
  if (
    ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name)
    && node.name.text === 'ptPT'
    && node.initializer
    && ts.isObjectLiteralExpression(node.initializer)
  ) {
    for (const property of node.initializer.properties) {
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue
      const key = propertyNameText(property.name)
      if (key === null) continue
      if (catalogueKeys.has(key)) duplicateKeys.add(key)
      catalogueKeys.add(key)
    }
  }
  ts.forEachChild(node, collectCatalogue)
}
collectCatalogue(catalogueSource)

if (catalogueKeys.size === 0) {
  throw new Error('Could not find the ptPT translation catalogue.')
}

const missing = []
const sourceFiles = await listSources(sourceRoot)

for (const file of sourceFiles) {
  if (file === cataloguePath) continue
  const source = ts.createSourceFile(
    file,
    await readFile(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isTranslationCall = ts.isIdentifier(node.expression)
        ? node.expression.text === 't'
        : ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === 't'
      const key = isTranslationCall ? literalText(node.arguments[0]) : null
      if (key !== null && !catalogueKeys.has(key)) {
        const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
        missing.push({
          file: relative(resolve('.'), file),
          line: line + 1,
          column: character + 1,
          key,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

if (duplicateKeys.size > 0 || missing.length > 0) {
  const details = []
  if (duplicateKeys.size > 0) {
    details.push(`Duplicate pt-PT keys: ${[...duplicateKeys].sort().join(', ')}`)
  }
  for (const item of missing) {
    details.push(`${item.file}:${item.line}:${item.column}: missing pt-PT key ${JSON.stringify(item.key)}`)
  }
  throw new Error(`Translation catalogue verification failed:\n${details.join('\n')}`)
}

console.log(`Verified ${catalogueKeys.size} pt-PT keys across ${sourceFiles.length - 1} source files.`)

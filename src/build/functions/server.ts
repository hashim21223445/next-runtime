import { nodeFileTrace } from '@vercel/nft'
import { copy, emptyDir, readJson, writeJSON } from 'fs-extra/esm'
import { writeFile } from 'fs/promises'
import { BUILD_DIR, PLUGIN_DIR, SERVER_HANDLER_DIR, SERVER_HANDLER_NAME } from '../constants.js'
import { copyServerContent } from '../content/server.js'

const pkg = await readJson(`${PLUGIN_DIR}/package.json`)

/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async () => {
  // reset the handler directory
  await emptyDir(SERVER_HANDLER_DIR)

  // trace the handler dependencies
  const { fileList } = await nodeFileTrace(
    [`${PLUGIN_DIR}/dist/run/handlers/server.js`, `${PLUGIN_DIR}/dist/run/handlers/cache.cjs`],
    { base: PLUGIN_DIR, ignore: ['package.json', 'node_modules/next/**'] },
  )

  // copy the handler dependencies
  await Promise.all(
    [...fileList].map((path) => copy(`${PLUGIN_DIR}/${path}`, `${SERVER_HANDLER_DIR}/${path}`)),
  )

  // copy the next.js standalone build output to the handler directory
  await Promise.all(
    await copyServerContent(`${BUILD_DIR}/.next/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`),
  )
  await copy(`${BUILD_DIR}/.next/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  // create the handler metadata file
  await writeJSON(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pkg.name}@${pkg.version}`,
      nodeBundler: 'none',
      includedFiles: [
        `${SERVER_HANDLER_NAME}*`,
        'package.json',
        'dist/**',
        '.next/**',
        'node_modules/**',
      ],
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  })

  // configure ESM
  await writeFile(`${SERVER_HANDLER_DIR}/package.json`, JSON.stringify({ type: 'module' }))

  // write the root handler file
  await writeFile(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.js`,
    `import handler from './dist/run/handlers/server.js';export default handler;export const config = {path:'/*'}`,
  )
}
// Netlify's Next.js runtime assembles the server function in its own onBuild step,
// but on Netlify's build machines it leaves out Prisma's Lambda engine
// (libquery_engine-rhel-openssl-3.0.x.so.node), so every route crashes with
// "could not locate the Query Engine". This runs right after that step, before
// the function is zipped, and copies the engine in. It fails the build if the
// engine is missing, so a broken deploy never goes live.
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ENGINE = 'libquery_engine-rhel-openssl-3.0.x.so.node'
const SRC_DIR = 'node_modules/.prisma/client'
const DEST_DIR =
  '.netlify/functions-internal/___netlify-server-handler/node_modules/.prisma/client'

module.exports = {
  onBuild({ utils }) {
    let src = path.join(SRC_DIR, ENGINE)
    if (!fs.existsSync(src)) {
      // Prisma writes .prisma/client next to wherever @prisma/client really
      // resolves, which isn't always the flat path, so search for it.
      const found = execSync(`find -L node_modules -name '${ENGINE}' 2>/dev/null || true`)
        .toString().trim().split('\n').filter(Boolean)
      console.log(`${src} missing; found: ${found.join(', ') || 'none'}`)
      console.log(`@prisma/client resolves to ${fs.realpathSync('node_modules/@prisma/client')}`)
      if (!found.length) {
        return utils.build.failBuild(`${ENGINE} was not generated; check binaryTargets in prisma/schema.prisma`)
      }
      src = found[0]
    }
    if (!fs.existsSync(DEST_DIR)) {
      return utils.build.failBuild(`${DEST_DIR} not found; did the Next.js runtime change its layout?`)
    }
    console.log(`Before copy, ${DEST_DIR} had: ${fs.readdirSync(DEST_DIR).join(', ')}`)
    fs.copyFileSync(src, path.join(DEST_DIR, ENGINE))
    console.log(`Copied ${ENGINE} into the server function`)
  },
}

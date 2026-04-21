import rss from './rss.mjs'

async function postbuild() {
  try {
    await rss()
  } catch (err) {
    // RSS generation failure must not break the build (e.g. backend unavailable in CI).
    console.warn('[postbuild] RSS generation failed:', err.message)
  }
}

postbuild()

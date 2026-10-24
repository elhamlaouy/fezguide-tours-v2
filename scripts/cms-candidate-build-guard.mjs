// Candidate-only safety gate: never let inherited automatic builds reach the old preview.
const markers = ['WORKERS_CI', 'WORKERS_CI_BUILD_UUID', 'WORKERS_CI_BRANCH', 'WORKERS_CI_COMMIT_SHA'];
if (markers.some(key => Boolean(process.env[key]))) {
  console.error('Blocked: this isolated candidate requires its reviewed explicit deployment path; no deployment through inherited Workers Builds.');
  process.exit(1);
}

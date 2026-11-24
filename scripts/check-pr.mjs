const requiredEventVariables = ["PR_BRANCH", "PR_TITLE"];

for (const name of requiredEventVariables) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exitCode = 1;
  }
}

if (process.exitCode === 1) {
  process.exit();
}

const branch = /^(a|b)\/[1-9][0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const conventionalSubject =
  /^(feat|fix|docs|chore|test|refactor|ci|build|style|perf|revert)(\([a-z0-9-]+\))?!?: \S.*$/u;

function validate(label, value, pattern, example) {
  if (!pattern.test(value)) {
    console.error(`${label} must match this format: ${example}`);
    process.exitCode = 1;
  }
}

validate("Branch", process.env.PR_BRANCH, branch, "a/12-evidence-log");
validate(
  "PR title",
  process.env.PR_TITLE,
  conventionalSubject,
  "feat(investigation): add evidence log",
);

for (const subject of (process.env.PR_COMMIT_SUBJECTS ?? "").split("\n").filter(Boolean)) {
  validate("Commit subject", subject, conventionalSubject, "feat(investigation): add evidence log");
}

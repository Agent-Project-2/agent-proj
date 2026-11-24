const requiredEventVariables = ["PR_BRANCH", "PR_TITLE"];

for (const name of requiredEventVariables) {
  if (!process.env[name]) {
    console.error(`필수 환경 변수가 누락되었습니다 (${name}).`);
    process.exitCode = 1;
  }
}

if (process.exitCode === 1) {
  process.exit();
}

const branch = /^(a|b)\/(?:[1-9][0-9]*|docs)-[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/u;
const conventionalSubject =
  /^(feat|fix|docs|chore|test|refactor|ci|build|style|perf|revert)(\([a-z0-9가-힣-]+\))?!?: \S.*$/u;

function validate(label, value, pattern, example) {
  if (!pattern.test(value)) {
    console.error(`${label} 형식이 올바르지 않습니다. 예시는 ${example}입니다.`);
    process.exitCode = 1;
  }
}

validate("브랜치명", process.env.PR_BRANCH, branch, "b/12-증거-조회-도구 또는 a/docs-회의록-정리");
validate("PR 제목", process.env.PR_TITLE, conventionalSubject, "feat(수사): 증거 기록 추가");

for (const subject of (process.env.PR_COMMIT_SUBJECTS ?? "").split("\n").filter(Boolean)) {
  validate("커밋 제목", subject, conventionalSubject, "feat(수사): 증거 기록 추가");
}

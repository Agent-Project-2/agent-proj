// UI verification uses only testimony that may already be disclosed to the player.
const voices = {
  dohyeon: {
    opening: "멀리서도 오셨네요. 자백서라면 벌써 드렸습니다.",
    question: "제가 적은 건 어제 여섯 시쯤이라는 겁니다. 종이에는 그렇게 적혀 있을 거예요.",
    daily: "라디오랑 시계를 고칩니다. 물건 찾으러 온 사람이 웃으면, 그날 일은 좀 덜 힘들죠.",
    persuade: "급한 건 조사관님이나 저나 같겠죠. 하나씩 물어보십시오.",
    promise: "그 약속, 기억하겠습니다. 무슨 말부터 하면 될까요?",
    document: "제 글씨가 맞습니다. 시각도 제가 그렇게 적었어요.",
    call: "일곱 시에 통화했다고요? …그럼 제가 쓴 시각부터 다시 봐야겠네요.",
  },
  seoyun: {
    opening: "기록을 찾으러 오셨나요? 날짜부터 정확히 말씀해 주세요.",
    question: "기억과 기록은 다를 수 있어요. 누가, 언제 남겼는지 먼저 확인하세요.",
    daily: "마을 기록을 정리해요. 언젠가 이 자료들을 책으로 엮어 보고 싶어요.",
    persuade: "출처를 함께 남기신다면 저도 기록을 대조해 보겠습니다.",
    promise: "약속하신 대로 제 말과 서류의 내용을 따로 적어 주세요.",
    document: "이건 한 사람의 진술이에요. 다른 시간 기록과 나란히 놓아 보세요.",
    call: "내역과 상대의 진술이 같은 시각을 가리키네요. 두 출처를 같이 적어 두세요.",
  },
  harin: {
    opening: "비 맞고 오셨죠? 잠깐 앉으세요. 이야기는 천천히 해도 되잖아요.",
    question: "여긴 작은 마을이라 말이 빨리 돌아요. 제가 직접 본 일부터 물어봐 주세요.",
    daily: "카페 문을 열고 단골손님들 잔부터 꺼내요. 누가 뭘 좋아하는지는 대개 기억해요.",
    persuade: "그렇게 물어봐 주시니 한결 편하네요. 제가 기억하는 만큼 말씀드릴게요.",
    promise: "제 말을 어디에 쓰실지 알려 주신다는 약속, 잊지 마세요.",
    document: "저도 자백했다는 얘기는 들었어요. 제가 본 일은 아니에요.",
    call: "통화 상대가 남긴 진술이군요. 저는 그 통화를 들은 사람이 아니에요.",
  },
  jaehyeon: {
    opening: "제가 도울 수 있는 일이라면요. 진료소 일지부터 살펴볼까요?",
    question: "분명히 기억하는 것과 나중에 들은 것은 나눠서 말씀드리겠습니다.",
    daily: "진료소 일을 돕고 있어요. 아침에는 화분부터 살핍니다. 잎에 변화가 금방 보이거든요.",
    persuade: "순서대로 물어봐 주시면 아는 범위에서 답하겠습니다.",
    promise: "고맙습니다. 말씀하신 대로 확인된 내용만 기록해 주세요.",
    document: "도현 씨가 쓴 말이군요. 시각은 다른 자료에서도 확인해 보시겠습니까?",
    call: "그 시각이라면 업무 기록도 함께 대조할 수 있겠네요.",
  },
};
export function openingLine(npcId) {
  return voices[npcId].opening;
}
export function statementFor({ npcId, action }) {
  const voice = voices[npcId];
  if (action.type === "question" && /직업|평소|일상|무슨 일|어떤 일/u.test(action.text))
    return voice.daily;
  if (action.type === "question" && /안녕|처음 뵙/u.test(action.text)) return voice.opening;
  if (action.type !== "present_evidence") return voice[action.type];
  if (action.evidenceId === "E04") return voice.call;
  if (action.evidenceId === "E01") return voice.document;
  return "이 자료는 제가 직접 남긴 게 아닙니다. 기록에 적힌 출처와 대조해 주세요.";
}

export const multiLastNames = [
  "남궁",
  "황보",
  "제갈",
  "선우",
  "서문",
  "독고",
  "동방",
  "사공",
];

export const singleLastNames = [
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "오",
  "한",
  "신",
  "서",
  "권",
  "황",
  "안",
  "송",
  "류",
  "홍",
  "전",
  "고",
  "문",
  "양",
  "손",
  "배",
  "백",
  "유",
  "남",
  "심",
  "노",
  "하",
  "곽",
  "성",
  "차",
  "주",
  "우",
  "구",
  "민",
  "진",
  "지",
  "엄",
  "채",
  "원",
  "천",
  "방",
  "공",
  "현",
  "변",
  "염",
  "도",
  "마",
  "육",
  "인",
  "탁",
  "계",
  "빈",
];

export function splitKoreanName(fullName) {
  const name = fullName.trim();
  if (!name) return { lastName: "", firstName: "" };

  for (const ln of multiLastNames) {
    if (name.startsWith(ln) && name.length > ln.length) {
      return { lastName: ln, firstName: name.slice(ln.length) };
    }
  }

  const firstChar = name.charAt(0);
  if (singleLastNames.includes(firstChar) && name.length > 1) {
    return { lastName: firstChar, firstName: name.slice(1) };
  }

  return { lastName: "", firstName: name };
}

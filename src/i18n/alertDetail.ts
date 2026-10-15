type Translate = (source: string, values?: Record<string, string | number>) => string;

/** Alert details are built in English with names inside, so match the shape and translate the frame. */
export function alertDetail(detail: string, t: Translate): string {
  const collect = detail.match(/^(.*) can collect (.*)\. (.*)$/);
  if (collect) {
    return t('{who} can collect {piece}. {number}', {
      who: collect[1],
      piece: collect[2],
      number: collect[3],
    });
  }
  const late = detail.match(/^(.*), (.*), was due (.*)\. (.*)$/);
  if (late) {
    return t('{who}, {piece}, was due {due}. {number}', {
      who: late[1],
      piece: late[2],
      due: late[3],
      number: late[4],
    });
  }
  const due = detail.match(/^(.*), (.*), is expected today\. (.*)$/);
  if (due) {
    return t('{who}, {piece}, is expected today. {number}', {
      who: due[1],
      piece: due[2],
      number: due[3],
    });
  }
  return t(detail);
}

/** Status-change events are stored as "Pending → Ready". */
export function eventDetail(detail: string, t: Translate): string {
  const parts = detail.split(' → ');
  return parts.length === 2 ? `${t(parts[0])} → ${t(parts[1])}` : detail;
}

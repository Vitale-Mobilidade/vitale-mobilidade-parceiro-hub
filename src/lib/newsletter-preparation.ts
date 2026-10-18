import { newsletterWindow } from "./newsletter";
export function newsletterPreparation(now: Date) {
  const today = newsletterWindow(now);
  const tomorrow = newsletterWindow(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );
  // Runs once on Sunday/Tuesday/Thursday from 06:30; catches up later that day.
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(now)
      .replace(":", ""),
  );
  const advance = [0, 2, 4].includes(today.weekday) && minute >= 630;
  const recovery = [1, 3, 5].includes(today.weekday) && minute < 830;
  return {
    day: recovery ? today.day : tomorrow.day,
    weekday: recovery ? today.weekday : tomorrow.weekday,
    due: advance || recovery,
  };
}

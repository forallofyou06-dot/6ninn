export function deadlineEndJst(deadline: string): Date {
  return new Date(`${deadline}T23:59:59+09:00`);
}

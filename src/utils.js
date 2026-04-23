export function shouldRedact(text, patterns) {
  if (!text) return false;

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(text);
    }
    return text.includes(pattern);
  });
}
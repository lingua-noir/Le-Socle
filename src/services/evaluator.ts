/**
 * Evaluator for French Active Recall
 * Evaluates typed French answers against expected French vocabulary
 * with intelligent diacritics handling and configurable typo tolerance.
 */

export interface EvaluationResult {
  isCorrect: boolean;
  isExact: boolean;
  hasAccentDifference: boolean;
  hasMinorTypo: boolean;
  similarity: number; // 0 to 100
  feedbackMessage: string;
}

/**
 * Normalize French text for comparison:
 * - lowercase
 * - trim whitespace
 * - replace ligature characters (œ -> oe, æ -> ae)
 * - strip punctuation like trailing periods or quotes
 */
export function normalizeFrenchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/^["'«]/, '')
    .replace(/["'»]$/, '')
    .replace(/[.,!?;:]/g, '')
    .trim();
}

/**
 * Strip diacritics (accents) using Unicode NFD decomposition
 */
export function stripAccents(text: string): string {
  return normalizeFrenchText(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calculate Damerau-Levenshtein distance (insertions, deletions, substitutions, transpositions)
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const matrix: number[][] = [];

  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[lenA][lenB];
}

/**
 * Evaluates a user-provided French answer against the target French word.
 * 
 * @param userAnswer The text the user entered
 * @param targetFrench The canonical French word/phrase from vocabulary
 * @param typoTolerance The configured tolerance percentage (e.g. 80 = 80%)
 */
export function evaluateFrenchAnswer(
  userAnswer: string,
  targetFrench: string,
  typoTolerance: number = 80
): EvaluationResult {
  const cleanUser = normalizeFrenchText(userAnswer);
  const cleanTarget = normalizeFrenchText(targetFrench);

  if (!cleanUser) {
    return {
      isCorrect: false,
      isExact: false,
      hasAccentDifference: false,
      hasMinorTypo: false,
      similarity: 0,
      feedbackMessage: 'No answer entered',
    };
  }

  // 1. Check exact match (including accents and case)
  if (cleanUser === cleanTarget) {
    return {
      isCorrect: true,
      isExact: true,
      hasAccentDifference: false,
      hasMinorTypo: false,
      similarity: 100,
      feedbackMessage: 'Exact match!',
    };
  }

  // Also check if user included or omitted common leading articles (e.g. "la maison" vs "maison")
  const strippedArticlesUser = cleanUser.replace(/^(le\s+|la\s+|l'|les\s+|un\s+|une\s+|des\s+)/, '');
  const strippedArticlesTarget = cleanTarget.replace(/^(le\s+|la\s+|l'|les\s+|un\s+|une\s+|des\s+)/, '');
  
  if (strippedArticlesUser === strippedArticlesTarget && strippedArticlesUser.length > 0) {
    return {
      isCorrect: true,
      isExact: true,
      hasAccentDifference: false,
      hasMinorTypo: false,
      similarity: 98,
      feedbackMessage: 'Correct!',
    };
  }

  const userStripped = stripAccents(cleanUser);
  const targetStripped = stripAccents(cleanTarget);

  // 2. Letters match completely, but accents differ (e.g., "decision" vs "décision")
  if (userStripped === targetStripped) {
    // Missing or altered accent: High similarity (92% base, or 95% if only 1 accent differs)
    const rawDistance = damerauLevenshteinDistance(cleanUser, cleanTarget);
    const accentPenalty = Math.min(15, rawDistance * 4);
    const similarity = Math.max(80, 100 - accentPenalty);

    const isAccepted = similarity >= typoTolerance;
    return {
      isCorrect: isAccepted,
      isExact: false,
      hasAccentDifference: true,
      hasMinorTypo: false,
      similarity,
      feedbackMessage: isAccepted
        ? 'Accepted! Note the French accent (e.g. é/è/à/ç).'
        : 'Missing required French accent marks for this tolerance setting.',
    };
  }

  // 3. Letters differ (minor typo or incorrect)
  // Compute distance on stripped strings to separate spelling typo from accent typo
  const strippedDist = damerauLevenshteinDistance(userStripped, targetStripped);
  const rawDist = damerauLevenshteinDistance(cleanUser, cleanTarget);
  const maxLen = Math.max(cleanUser.length, cleanTarget.length);

  // Calculate base letter similarity percentage
  const letterSimilarity = Math.max(0, Math.round((1 - strippedDist / maxLen) * 100));
  
  // Apply minor accent penalty if accents also differed
  const hadAccentsDiff = cleanUser !== userStripped || cleanTarget !== targetStripped;
  const finalSimilarity = hadAccentsDiff 
    ? Math.max(0, letterSimilarity - (rawDist - strippedDist) * 3)
    : letterSimilarity;

  const isAccepted = finalSimilarity >= typoTolerance;

  if (isAccepted) {
    return {
      isCorrect: true,
      isExact: false,
      hasAccentDifference: rawDist !== strippedDist,
      hasMinorTypo: true,
      similarity: finalSimilarity,
      feedbackMessage: `Accepted with minor typo (${finalSimilarity}% similarity).`,
    };
  }

  return {
    isCorrect: false,
    isExact: false,
    hasAccentDifference: rawDist !== strippedDist,
    hasMinorTypo: strippedDist <= 2,
    similarity: finalSimilarity,
    feedbackMessage: 'Incorrect',
  };
}

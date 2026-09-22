/**
 * Fact-Checking & Agency Guardrail Service
 * Prevents AI from hallucinating or promising unverified claims:
 * - Specific prices / arbitrary dollar amounts ($XX, ₹XX)
 * - Specific delivery deadlines ("by tomorrow", "in 2 days guaranteed")
 * - Unverified refunds ("100% money-back guarantee", "full refund")
 * - Unrealistic guarantees ("100% guaranteed #1 ranking", "guaranteed 10x sales")
 * - "Free sample / free mockup" phrasing (Prohibited by agency policy)
 */

export interface GuardrailResult {
  isValid: boolean;
  sanitizedText: string;
  warnings: string[];
  blockedPromises: string[];
}

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; type: string; warning: string }> = [
  {
    regex: /\b(free\s+samples?|free\s+mockups?|free\s+concepts?|free\s+previews?|free\s+trials?|free\s+audits?|muft|muft\s+mein)\b/gi,
    type: 'FREE_SAMPLE_PROHIBITED',
    warning: 'Prohibited "free sample/free mockup" phrasing detected and replaced with professional concept preview phrasing.',
  },
  {
    regex: /\b(100%\s+money[- ]back\s+guarantee|full\s+refund|money[- ]back\s+guarantee|risk[- ]free\s+refund)\b/gi,
    type: 'REFUND_PROMISE',
    warning: 'Unverified refund promise detected and blocked.',
  },
  {
    regex: /\b(guaranteed\s+delivery\s+by|finish(ed)?\s+by\s+(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|done\s+within\s+\d+\s+hours)\b/gi,
    type: 'DATE_PROMISE',
    warning: 'Unverified strict deadline promise detected and blocked.',
  },
  {
    regex: /\b(only\s+\$\d+|for\s+just\s+\$\d+|costs?\s+only\s+\$\d+|\$\d{1,4}\s+total\s+cost|only\s+₹\d+|just\s+₹\d+)\b/gi,
    type: 'UNAUTHORIZED_PRICE_PROMISE',
    warning: 'Specific unverified price quote detected. (Prices should only be discussed during direct proposals).',
  },
  {
    regex: /\b(guaranteed\s+(#1|top\s+1)\s+(ranking|spot)|guarantee\s+10x\s+(revenue|sales|leads)|100%\s+guaranteed\s+results)\b/gi,
    type: 'UNREALISTIC_GUARANTEE',
    warning: 'Unrealistic or unprovable guarantee claim blocked.',
  },
  {
    regex: /\b(3d\s*animation|three[\s-]?dimensional\s+animation|2d\s*animation|two[\s-]?dimensional\s+animation|\bvfx\b|visual\s+effects|\bcgi\b)\b/gi,
    type: 'OUT_OF_SCOPE_SERVICE',
    warning: 'Out-of-scope service claim (3D/2D animation, VFX, or CGI) detected and replaced — we only offer video editing, motion graphics, graphic design, and website design & development.',
  },
];

export function validateAndSanitizePitch(text: string): GuardrailResult {
  let sanitized = text;
  const warnings: string[] = [];
  const blockedPromises: string[] = [];

  for (const item of FORBIDDEN_PATTERNS) {
    if (item.regex.test(sanitized)) {
      warnings.push(item.warning);
      blockedPromises.push(item.type);

      // Sanitize / replace forbidden patterns
      if (item.type === 'FREE_SAMPLE_PROHIBITED') {
        sanitized = sanitized.replace(/\bfree\s+samples?\b/gi, 'sample concept');
        sanitized = sanitized.replace(/\bfree\s+mockups?\b/gi, 'concept mockup');
        sanitized = sanitized.replace(/\bfree\s+previews?\b/gi, 'quick preview');
        sanitized = sanitized.replace(/\bfree\s+concepts?\b/gi, 'custom concept');
        sanitized = sanitized.replace(/\bfree\s+audits?\b/gi, 'detailed audit breakdown');
        sanitized = sanitized.replace(/\bfree\b/gi, 'quick');
      } else if (item.type === 'REFUND_PROMISE') {
        sanitized = sanitized.replace(item.regex, 'satisfaction-focused approach');
      } else if (item.type === 'DATE_PROMISE') {
        sanitized = sanitized.replace(item.regex, 'with a rapid turnaround');
      } else if (item.type === 'UNAUTHORIZED_PRICE_PROMISE') {
        sanitized = sanitized.replace(item.regex, 'flexible custom packages');
      } else if (item.type === 'UNREALISTIC_GUARANTEE') {
        sanitized = sanitized.replace(item.regex, 'significant measurable improvements');
      } else if (item.type === 'OUT_OF_SCOPE_SERVICE') {
        sanitized = sanitized.replace(item.regex, 'motion graphics');
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    sanitizedText: sanitized.trim(),
    warnings,
    blockedPromises,
  };
}

export function getGuardrailRulesDescription(): string {
  return `STRICT FACT-CHECKING & AGENCY RULES:
1. NEVER USE THE WORD 'FREE' OR 'FREE SAMPLE/MOCKUP'. Never say "free sample", "free mockup", or "free concept". Always refer to it simply as a "concept preview", "mockup preview", "sample concept", or "quick demo".
2. NEVER promise specific unverified prices or random dollar/rupee figures.
3. NEVER promise fixed delivery deadlines or guaranteed dates.
4. NEVER promise money-back refunds or financial guarantees.
5. NEVER make unrealistic claims like "guaranteed #1 Google ranking".
6. NEVER offer or mention 3D animation, 2D animation, VFX, visual effects, or CGI — Klyperix Production only offers video editing, motion graphics, graphic design, and website design & development.`;
}

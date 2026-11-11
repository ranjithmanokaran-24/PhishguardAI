export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskFinding {
  label: string;
  points: number;
}

export interface RiskReport {
  score: number;
  level: RiskLevel;
  findings: RiskFinding[];
}

const SUSPICIOUS_TLDS = ['zip', 'mov', 'xyz', 'top', 'click', 'tk', 'gq', 'ml', 'cf', 'ga', 'work', 'support'];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'rebrand.ly', 'cutt.ly'];
const BRAND_NAMES = ['paypal', 'apple', 'microsoft', 'google', 'amazon', 'netflix', 'facebook', 'instagram', 'bank', 'chase', 'wellsfargo'];
const URL_KEYWORDS = ['login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm', 'wallet', 'password'];

const URGENCY_PHRASES = ['urgent', 'immediately', 'act now', 'final notice', 'within 24 hours', 'within 48 hours', 'expires today', 'last warning', 'right away'];
const THREAT_PHRASES = ['suspended', 'account will be closed', 'legal action', 'arrest', 'blocked', 'deactivated', 'penalty', 'frozen'];
const CREDENTIAL_PHRASES = ['password', 'pin number', 'social security', 'ssn', 'verify your account', 'confirm your identity', 'bank details', 'credit card', 'one-time code', 'otp', 'login details'];
const REWARD_PHRASES = ['you have won', 'you won', 'prize', 'lottery', 'inheritance', 'gift card', 'free gift', 'cash reward', 'claim your'];
const PAYMENT_PHRASES = ['wire transfer', 'processing fee', 'bitcoin', 'crypto', 'western union', 'gift cards', 'send money', 'pay a fee'];
const GENERIC_GREETINGS = ['dear customer', 'dear user', 'dear valued member', 'dear client'];

const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function toLevel(score: number): RiskLevel {
  if (score >= 55) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function buildReport(findings: RiskFinding[]): RiskReport {
  const score = Math.min(100, findings.reduce((sum, finding) => sum + finding.points, 0));
  return { score, level: toLevel(score), findings };
}

function countMatches(text: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => text.includes(phrase));
}

export function analyzeUrl(rawInput: string): RiskReport | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const findings: RiskFinding[] = [];
  const host = url.hostname.toLowerCase();
  const fullLower = withScheme.toLowerCase();
  const hostParts = host.split('.');
  const tld = hostParts[hostParts.length - 1];
  const rootDomain = hostParts.slice(-2).join('.');

  if (url.protocol !== 'https:') {
    findings.push({ label: 'Connection is not encrypted (no https)', points: 15 });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    findings.push({ label: 'Uses a raw IP address instead of a website name', points: 30 });
  }
  if (url.username || url.password || fullLower.includes('@')) {
    findings.push({ label: 'Contains an "@" that can hide the real destination', points: 25 });
  }
  if (host.startsWith('xn--') || host.includes('.xn--')) {
    findings.push({ label: 'Uses special lookalike characters in the domain', points: 25 });
  }
  if (SUSPICIOUS_TLDS.includes(tld)) {
    findings.push({ label: `Domain ending ".${tld}" is often used by scammers`, points: 20 });
  }
  if (SHORTENERS.includes(rootDomain) || SHORTENERS.includes(host)) {
    findings.push({ label: 'Shortened link hides where it really goes', points: 15 });
  }
  if (hostParts.length >= 4) {
    findings.push({ label: 'Many subdomains stacked together', points: 15 });
  }
  if ((host.match(/-/g) ?? []).length >= 3) {
    findings.push({ label: 'Domain has many hyphens', points: 10 });
  }
  if (url.port && url.port !== '443' && url.port !== '80') {
    findings.push({ label: `Unusual port number (${url.port})`, points: 10 });
  }
  if (withScheme.length > 100) {
    findings.push({ label: 'Very long web address', points: 10 });
  }
  if (/%[0-9a-f]{2}/i.test(withScheme) && (withScheme.match(/%[0-9a-f]{2}/gi) ?? []).length >= 3) {
    findings.push({ label: 'Heavily encoded characters in the address', points: 10 });
  }

  const brandHits = BRAND_NAMES.filter((brand) => host.includes(brand) && !rootDomain.startsWith(`${brand}.`));
  if (brandHits.length > 0) {
    findings.push({ label: `Mentions "${brandHits[0]}" but is not that official site`, points: 30 });
  }

  const keywordHits = URL_KEYWORDS.filter((keyword) => fullLower.includes(keyword));
  if (keywordHits.length >= 2) {
    findings.push({ label: 'Pushes urgent account or login keywords', points: 20 });
  } else if (keywordHits.length === 1) {
    findings.push({ label: `Contains the word "${keywordHits[0]}"`, points: 8 });
  }

  return buildReport(findings);
}

export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(URL_PATTERN) ?? []));
}

export function analyzeMessage(rawText: string): RiskReport | null {
  const text = rawText.trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const findings: RiskFinding[] = [];

  const urgency = countMatches(lower, URGENCY_PHRASES);
  if (urgency.length > 0) {
    findings.push({ label: 'Creates a sense of urgency', points: urgency.length > 1 ? 20 : 12 });
  }

  const threats = countMatches(lower, THREAT_PHRASES);
  if (threats.length > 0) {
    findings.push({ label: 'Threatens your account or access', points: 18 });
  }

  const credentials = countMatches(lower, CREDENTIAL_PHRASES);
  if (credentials.length > 0) {
    findings.push({ label: 'Asks for passwords, codes, or personal details', points: credentials.length > 1 ? 30 : 22 });
  }

  const rewards = countMatches(lower, REWARD_PHRASES);
  if (rewards.length > 0) {
    findings.push({ label: 'Promises a prize, reward, or inheritance', points: 20 });
  }

  const payments = countMatches(lower, PAYMENT_PHRASES);
  if (payments.length > 0) {
    findings.push({ label: 'Requests money, fees, or untraceable payment', points: 22 });
  }

  if (countMatches(lower, GENERIC_GREETINGS).length > 0) {
    findings.push({ label: 'Generic greeting instead of your name', points: 8 });
  }

  const urls = extractUrls(text);
  const linkReports = urls
    .map((link) => analyzeUrl(link))
    .filter((report): report is RiskReport => report !== null);
  const riskiestLink = linkReports.reduce<RiskReport | null>(
    (worst, report) => (!worst || report.score > worst.score ? report : worst),
    null,
  );
  if (riskiestLink && riskiestLink.score >= 25) {
    findings.push({ label: 'Contains a link that looks suspicious', points: Math.round(riskiestLink.score / 2) });
  } else if (urls.length > 0) {
    findings.push({ label: 'Contains a link to check before opening', points: 5 });
  }

  const letters = text.replace(/[^a-zA-Z]/g, '');
  const upperRatio = letters.length > 0 ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;
  if (letters.length > 20 && upperRatio > 0.5) {
    findings.push({ label: 'Excessive use of capital letters', points: 8 });
  }
  if ((text.match(/!/g) ?? []).length >= 3) {
    findings.push({ label: 'Lots of exclamation marks', points: 6 });
  }

  return buildReport(findings);
}

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Paths
const packageJsonPath = join(__dirname, '../package.json');
const changelogPath = join(__dirname, '../CHANGELOG.md');

// Get current version from package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

// Bump patch version
const [major, minor, patch] = currentVersion.split('.').map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;

// Get previous version from git tags
const previousVersion = execSync('git describe --tags --abbrev=0 HEAD^').toString().trim();

// Get commit messages between previous version and current version
const commitMessages = execSync(`git log ${previousVersion}..HEAD --pretty=format:"- %s"`).toString().trim();

// Get current date
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'; // Covers 11th to 19th
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatDateToString(): string {
  const days: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today: Date = new Date();
  const dayName: string = days[today.getDay()];
  const day: number = today.getDate();
  const monthName: string = months[today.getMonth()];
  const year: number = today.getFullYear();

  const ordinalSuffix: string = getOrdinalSuffix(day);

  return `${dayName} ${day}${ordinalSuffix} ${monthName}, ${year}`;
}

const currentDate = formatDateToString();

// Read current CHANGELOG.md content
const changelogContent = readFileSync(changelogPath, 'utf-8');

// Create new changelog entry
const newChangelogEntry = `### ${nextVersion} - ${currentDate}

${commitMessages}
`;

// Insert new changelog entry at the top
// const updatedChangelogContent = newChangelogEntry + changelogContent;
const changelogLines = changelogContent.split('\n');
changelogLines.splice(2, 0, newChangelogEntry);
const updatedChangelogContent = changelogLines.join('\n');

// Save updated CHANGELOG.md
writeFileSync(changelogPath, updatedChangelogContent, 'utf-8');

console.log('CHANGELOG.md updated successfully.');
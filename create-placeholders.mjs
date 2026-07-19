import fs from 'fs';
import path from 'path';

const files = [
  'src/lib/validation/tag.ts',
  'src/lib/validation/settings.ts',
  'src/lib/utils/slugify.ts',
  'src/lib/utils/cursor.ts',
  'src/lib/utils/formatDate.ts',
  'src/hooks/useArtworks.ts',
  'src/hooks/useAuth.ts',
  'src/hooks/useInfiniteScroll.ts',
  'src/hooks/useFilters.ts',
  'src/types/artwork.ts',
  'src/types/tag.ts',
  'src/types/settings.ts',
  'src/types/api.ts',
  'scripts/seed-admin.ts',
  'proxy.ts',
  '.env.example',
];

const content = '// TODO-001 placeholder\n';

let created = 0;
for (const file of files) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    created++;
  }
}

console.log(`Created ${created} placeholder files`);
process.exit(0);
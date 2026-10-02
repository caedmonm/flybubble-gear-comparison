import { createShareLinkService } from '../server/share-links.mjs';

const service = createShareLinkService();
try {
  await service.migrate();
  console.log('gear_share_links table is ready.');
} catch {
  console.error(
    'Could not create gear_share_links. Check database configuration, TLS, connectivity and CREATE permission.',
  );
  process.exitCode = 1;
} finally {
  await service.close();
}

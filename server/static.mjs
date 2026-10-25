import express from 'express';
import { fileURLToPath } from 'node:url';

export function mountProductionFiles(app) {
  app.get('/app', (_req, res) => res.sendFile(fileURLToPath(new URL('../dist/app/index.html', import.meta.url))));
  app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url)), { dotfiles: 'deny' }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.includes('.') && !req.path.startsWith('/api/')) {
      return res.status(404).sendFile(fileURLToPath(new URL('../dist/404.html', import.meta.url)));
    }
    next();
  });
  app.use((_req, res) => res.status(404).type('text').send('This page does not exist. Open / to start a DROP room.'));
}

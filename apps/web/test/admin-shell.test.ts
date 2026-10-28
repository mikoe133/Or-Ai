import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AdminShell } from '../src/admin/shell.js';

test('admin navigation leads to one main workspace while locked navigation stays unavailable', () => {
  for (const authorized of [false, true]) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/admin/products'] },
      createElement(AdminShell, { authorized, accountPresent: authorized, children: createElement('p', null, 'isolated fixture') })));
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, 'the skip link target must be the main landmark');
    assert.match(html, /<main\b[^>]*id="admin-workspace"/);
    assert.match(html, /href="#admin-workspace"/);
    assert.equal(/<a\b[^>]*href="\/admin\/products"/.test(html), authorized);
  }
});

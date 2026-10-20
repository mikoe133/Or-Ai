import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories(@Query() query: unknown) { return this.catalog.categories(query); }

  @Get('tags')
  tags(@Query() query: unknown) { return this.catalog.tags(query); }

  @Get('products')
  products(@Query() query: unknown) { return this.catalog.list(query); }

  @Get('products/:slug')
  product(@Param('slug') slug: unknown, @Query() query: unknown) { return this.catalog.detail(slug, query); }
}

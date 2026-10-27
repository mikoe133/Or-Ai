import { Controller,Get,Post,HttpCode,Body,Param,Query,Req,UseGuards } from '@nestjs/common';
import { AdminPageQuerySchema } from '@orai/contracts/admin';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard,type AdminRequest } from './admin-request.guard';
import { ProductionRunsService } from './production-runs.service';
import { ProductionRunOperationsService } from './production-run-operations.service';
import {RunOperationsQuerySchema} from '@orai/contracts/admin';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ProductionRunsController {
  constructor(private readonly runs:ProductionRunsService,private readonly operations:ProductionRunOperationsService){}
  @Get('production-runs/:id/operations') operationsRead(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){
    parseInput(RunOperationsQuerySchema,q);return this.operations.read(r.administrator,id);
  }
  @Get('production-runs/:id/attempts') history(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){return this.operations.history(r.administrator,id,q);}
  @Post('production-runs/:id/stop/preview') @HttpCode(200) stopPreview(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){
    parseInput(RunOperationsQuerySchema,b);return this.operations.stopPreview(r.administrator,id);
  }
  @Post('production-runs/:id/stop') @HttpCode(200) stop(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){return this.operations.stop(r.administrator,id,b);}
  @Get('production-attempts/:id/recovery-inputs') inputs(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){return this.operations.recoveryInputs(r.administrator,id,q);}
  @Post('production-attempts/:id/recovery/preview') @HttpCode(200) recovery(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){return this.operations.recoveryPreview(r.administrator,id,b);}
  @Post('production-attempts/:id/recovery/export') @HttpCode(200) export(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){return this.operations.recoveryExport(r.administrator,id,b);}
  @Get('products/:id/production-runs') list(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){
    return this.runs.list(r.administrator,id,parseInput(AdminPageQuerySchema,q));
  }
  @Get('production-runs/:id') read(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){
    parseInput(CatalogMetadataQuerySchema,q);return this.runs.readAdmin(r.administrator,id);
  }
  @Get('production-attempts/:id') attempt(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){
    parseInput(CatalogMetadataQuerySchema,q);return this.runs.attemptAdmin(r.administrator,id);
  }
}

import {Body,Controller,Get,Post,HttpCode,Param,Query,Req,UseGuards} from '@nestjs/common';
import {AdminPageQuerySchema,ExternalConfigurationReadQuerySchema} from '@orai/contracts/admin';
import {parseInput} from '../common/parse-input';
import {AdminRequestGuard,type AdminRequest} from './admin-request.guard';
import {ExternalRunConfigurationsService} from './external-run-configurations.service';

@Controller('admin/external-run-configurations')
@UseGuards(AdminRequestGuard)
export class ExternalRunConfigurationsController{
 constructor(private readonly configurations:ExternalRunConfigurationsService){}
 @Get('options') options(@Req() r:AdminRequest,@Query() q:unknown){return this.configurations.options(r.administrator,q);}
 @Get() list(@Req() r:AdminRequest,@Query() q:unknown){return this.configurations.list(r.administrator,parseInput(AdminPageQuerySchema,q));}
 @Post() @HttpCode(200) create(@Req() r:AdminRequest,@Body() b:unknown){return this.configurations.create(r.administrator,b);}
 @Get(':id') read(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){const query=parseInput(ExternalConfigurationReadQuerySchema,q);return this.configurations.read(r.administrator,id,query.revisionId);}
 @Get(':id/revisions') history(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){return this.configurations.history(r.administrator,id,parseInput(AdminPageQuerySchema,q));}
 @Post(':id/revisions') @HttpCode(200) save(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){return this.configurations.save(r.administrator,id,b);}
 @Post(':id/validate') @HttpCode(200) validate(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){return this.configurations.validate(r.administrator,id,b);}
 @Post(':id/export') @HttpCode(200) export(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown){return this.configurations.export(r.administrator,id,b);}
}

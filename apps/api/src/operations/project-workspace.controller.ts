import { Controller,Get,Param,Query,Req,UseGuards } from '@nestjs/common';
import { AdminRequestGuard,type AdminRequest } from './admin-request.guard';
import { ProjectWorkspaceService } from './project-workspace.service';
@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ProjectWorkspaceController {
  constructor(private readonly workspaces:ProjectWorkspaceService){}
  @Get('products/:id/project-workspace')
  read(@Req() request:AdminRequest,@Param('id') id:string,@Query() query:unknown){return this.workspaces.read(request.administrator,id,query);}
}

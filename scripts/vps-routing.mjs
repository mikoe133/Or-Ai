import {isIP} from 'node:net';
import {lstat,readFile,open,rm} from 'node:fs/promises';
import {parseArgs,parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';

export function renderVpsNginx(env){
  let url;try{url=new URL(env.APP_PUBLIC_ORIGIN);}catch{throw Error('VPS_CONFIGURATION_INVALID');}
  const host=url.hostname;
  const bytes=Number(env.UPLOAD_INGRESS_BODY_BYTES),timeout=Number(env.ASSET_UPLOAD_TIMEOUT_MS);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||isIP(host)||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)||/(?:^|\.)(?:localhost|local|internal)$/.test(host)||
    !/^\d+$/.test(env.UPLOAD_INGRESS_BODY_BYTES??'')||!Number.isSafeInteger(bytes)||bytes<1||bytes>1024*1024*1024||
    !/^\d+$/.test(env.ASSET_UPLOAD_TIMEOUT_MS??'')||!Number.isSafeInteger(timeout)||timeout<1000||timeout>600000||timeout%1000)
    throw Error('VPS_CONFIGURATION_INVALID');
  return `worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 512; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  log_format private_access '$remote_addr "$request_method $uri" $status $body_bytes_sent';
  access_log /dev/stdout private_access;
  server_tokens off;
  client_body_temp_path /tmp/client_body;
  proxy_temp_path /tmp/proxy;
  fastcgi_temp_path /tmp/fastcgi;
  uwsgi_temp_path /tmp/uwsgi;
  scgi_temp_path /tmp/scgi;
  client_max_body_size ${bytes};
  client_body_timeout ${timeout/1000}s;
  send_timeout ${timeout/1000}s;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_certificate /run/tls/fullchain.pem;
  ssl_certificate_key /run/tls/privkey.pem;
  ssl_session_cache shared:TLS:1m;
  ssl_session_tickets off;
  server { listen 8080 default_server; server_name _; return 444; }
  server {
    listen 8080;
    server_name ${host} www.${host};
    return 308 ${url.origin}$request_uri;
  }
  server { listen 8443 ssl default_server; ssl_reject_handshake on; server_name _; }
  server {
    listen 8443 ssl;
    server_name www.${host};
    return 308 ${url.origin}$request_uri;
  }
  server {
    listen 8443 ssl;
    server_name ${host};
    if ($host != ${host}) { return 444; }
    root /usr/share/nginx/html;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/javascript application/javascript text/css application/json image/svg+xml;
    location = /api { return 404; }
    location /api/ {
      proxy_pass http://api:4100;
      proxy_http_version 1.1;
      proxy_set_header Host ${host};
      proxy_set_header X-Forwarded-Host ${host};
      proxy_set_header X-Forwarded-Proto $scheme;
      # Overwrite client-supplied forwarding headers. Cloudflare client IP trust is configured and verified in Task08.
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header Connection "";
      proxy_set_header Accept-Encoding "";
      proxy_request_buffering off;
      proxy_buffering off;
      proxy_connect_timeout 5s;
      proxy_read_timeout ${timeout/1000}s;
      proxy_send_timeout ${timeout/1000}s;
      proxy_cache off;
      proxy_hide_header Cache-Control;
      proxy_hide_header Expires;
      add_header Cache-Control "no-store" always;
      add_header X-Content-Type-Options nosniff always;
      gzip off;
    }
    location /assets/ { try_files $uri =404; add_header Cache-Control "no-cache" always; }
    location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache" always; }
  }
  server {
    listen 8081;
    server_name _;
    access_log off;
    location = /_health/live { return 204; }
    location / { return 404; }
  }
}
`;
}
export async function runVpsRender(args){
  let values;
  try{({values}=parseArgs({args,strict:true,options:{'env-file':{type:'string'},out:{type:'string'}}}));}
  catch{return {ok:false,error:'EXPLICIT_ENV_AND_OUTPUT_REQUIRED'};}
  if(!values['env-file']||!values.out)return {ok:false,error:'EXPLICIT_ENV_AND_OUTPUT_REQUIRED'};
  let content;
  try{const info=await lstat(values['env-file']);if(!info.isFile()||info.isSymbolicLink()||info.size>1024*1024)throw Error();
    content=renderVpsNginx(parseEnv(await readFile(values['env-file'],'utf8')));
  }catch{return {ok:false,error:'VPS_CONFIGURATION_INVALID'};}
  let output;try{output=await open(values.out,'wx',0o644);}catch{return {ok:false,error:'OUTPUT_EXISTS_OR_UNWRITABLE'};}
  try{await output.writeFile(content);return {ok:true};}
  catch{await rm(values.out,{force:true});return {ok:false,error:'OUTPUT_WRITE_FAILED'};}
  finally{await output.close();}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const result=await runVpsRender(process.argv.slice(2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
}

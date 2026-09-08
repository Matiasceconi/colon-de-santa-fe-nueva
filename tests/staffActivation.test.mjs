import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
const token = 'test-only-private-token';
const hash = Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
let passed=0;
async function scenario(name, fn, opts={}, body={}) {
  const writes=[], emails=[];
  const access={id:'access',user_email:'person@example.test',active:false,password_setup_required:true,invitation_status:'pending_password',activation_version:2,...opts.access};
  const invitation={id:'inv',access_id:'access',email:access.user_email,active:true,token_hash:hash,activation_version:2,expires_at:new Date(Date.now()+86400000).toISOString(),...opts.invitation};
  const caller=opts.caller || {email:access.user_email,is_verified:true,role:fn==='send-staff-invitation'?'admin':'user'};
  const matches=(r,q)=>Object.entries(q).every(([k,v])=>r[k]===v);
  const entities={
    UserAccess:{get:async()=>({...access}),filter:async q=>matches(access,q)?[{...access}]:[],update:async(id,p)=>{writes.push({entity:'access',id,p});Object.assign(access,p);}},
    StaffInvitation:{filter:async q=>matches(invitation,q)?[{...invitation}]:[],create:async p=>{writes.push({entity:'invitation',p});return {id:'new'};},update:async(id,p)=>{writes.push({entity:'invitation',id,p});Object.assign(invitation,p);}},
    InstitutionProfile:{filter:async()=>[{application_url:'https://club.example.test'}]},PublicClubBrand:{filter:async()=>[]},User:{filter:async()=>[]},
  };
  const client={auth:{me:async()=>caller},asServiceRole:{entities},users:{inviteUser:async()=>{emails.push('native');if(opts.failMail)throw Error('native rejected');}},integrations:{Core:{SendEmail:async()=>{emails.push('direct');if(opts.failMail)throw Error('direct rejected');}}}};
  let handler;
  const shared=fs.readFileSync('base44/shared/staffAccessAdmin.ts','utf8').replace('export async function','async function');
  const source=shared+'\n'+fs.readFileSync(`base44/functions/${fn}/entry.ts`,'utf8').replace(/^import .*\n/gm,'');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  vm.runInNewContext(compiled,{createClientFromRequest:()=>client,Deno:{serve:f=>handler=f},crypto:webcrypto,TextEncoder,btoa,URL,Response,console,Uint8Array});
  const invoke=async payload=>{const response=await handler(new Request('https://club.example.test/api',{method:'POST',body:JSON.stringify(payload)}));return {status:response.status,data:await response.json()};};
  const result=await invoke(body);
  const check=opts.check; if(check)await check({result,writes,emails,access,invoke});
  passed++;console.log('PASS',name);
}
await scenario('prepare link sends no mail or access mutations','send-staff-invitation',{check:({result,writes,emails})=>{assert.equal(result.data.link_ready,true);assert.equal(emails.length,0);assert.equal(writes.filter(w=>w.entity==='access').length,0);assert.ok(result.data.activation_path.includes('#invitation='));assert.ok(writes[0].p.token_hash);assert.equal(writes[0].p.token,undefined);}},{accessId:'access',email:'person@example.test',sendEmail:false});
await scenario('mail failure retains usable link and pending access','send-staff-invitation',{failMail:true,check:({result,writes})=>{assert.equal(result.data.success,false);assert.equal(result.data.link_ready,true);assert.equal(writes.filter(w=>w.entity==='access').length,0);}},{accessId:'access',email:'person@example.test'});
await scenario('active account keeps login and receives no new activation','send-staff-invitation',{access:{active:true,password_setup_required:false,invitation_status:'active'},check:({result,writes})=>{assert.ok(result.data.activation_path.startsWith('/login'));assert.equal(writes.length,0);}},{accessId:'access',email:'person@example.test',sendEmail:false});
await scenario('non admin cannot prepare','send-staff-invitation',{caller:{email:'person@example.test',role:'user'},check:({result,writes})=>{assert.equal(result.status,403);assert.equal(writes.length,0);}},{accessId:'access',email:'person@example.test',sendEmail:false});
for(const [name,value] of [['missing token',''],['wrong token','wrong']]) await scenario(name,'validate-staff-invitation',{check:({result})=>assert.equal(result.status,404)},{email:'person@example.test',token:value});
await scenario('expired link rejected','validate-staff-invitation',{invitation:{expires_at:'2020-01-01'},check:({result})=>assert.equal(result.status,404)},{email:'person@example.test',token});
await scenario('correct token validates','validate-staff-invitation',{check:({result})=>assert.equal(result.data.valid,true)},{email:'person@example.test',token});
await scenario('wrong signed in email rejected','accept-staff-invitation',{caller:{email:'other@example.test',is_verified:true},check:({result,writes})=>{assert.equal(result.status,400);assert.equal(writes.length,0);}},{token});
await scenario('unverified account rejected','accept-staff-invitation',{caller:{email:'person@example.test',is_verified:false},check:({result,writes})=>{assert.equal(result.status,403);assert.equal(writes.length,0);}},{token});
await scenario('activation succeeds once; replay rejected','accept-staff-invitation',{check:async({result,access,invoke})=>{assert.equal(result.data.success,true);assert.equal(access.active,true);assert.equal(access.password_setup_required,false);const again=await invoke({token});assert.equal(again.status,400);}},{token});
await scenario('old login cannot activate new account','confirmStaffPasswordSetup',{check:({result,writes})=>{assert.equal(result.data.updated,0);assert.equal(writes.length,0);}},{});
console.log(`${passed} scenarios passed. Mock providers only; no real users or emails.`);

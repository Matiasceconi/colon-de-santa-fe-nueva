import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const shared=fs.readFileSync('base44/shared/staffAccessAdmin.ts','utf8').replace('export async function','async function');
const source=shared+'\n'+fs.readFileSync('base44/functions/manage-staff-access/entry.ts','utf8').replace(/^import .*\n/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let count=0;
async function run(name,options,body,check) {
 const writes=[];
 const caller={email:'manager@example.test',role:'user',...options.caller};
 const adminAccess={id:'manager',user_email:caller.email,active:true,password_setup_required:false,role_ids:['admin-role'],...options.adminAccess};
 const rows=options.noAccess?[]:[adminAccess];
 if(options.existing)rows.push(options.existing);
 const roles=[{id:'admin-role',name:'Administrador general',active:true,can_admin:true,...options.adminRole},{id:'pf-role',name:'PF',active:true,can_admin:false}];
 const db={
  UserAccess:{filter:async(q)=>rows.filter(row=>Object.entries(q).every(([k,v])=>row[k]===v)),get:async id=>rows.find(r=>r.id===id),create:async payload=>{writes.push(payload);return {...payload,id:'new'};},update:async(id,payload)=>{writes.push(payload);return {...rows.find(r=>r.id===id),...payload};}},
  AppRole:{get:async id=>roles.find(r=>r.id===id)},
  StaffMember:{get:async id=>({id,first_name:'Test',last_name:'Staff',active:true})},
  Squad:{get:async id=>id==='squad'?{id,name:'Reserva'}:null},
 };
 let handler;vm.runInNewContext(compiled,{createClientFromRequest:()=>({auth:{me:async()=>caller},asServiceRole:{entities:db}}),Deno:{serve:fn=>handler=fn},Response,console});
 const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));const data=await response.json();
 check({status:response.status,data,writes});console.log('PASS',name);count++;
}
const prepare={action:'prepare',staffId:'staff',form:{user_email:'new@example.test',role_ids:['pf-role'],squad_ids:['squad'],all_squads:false}};
await run('club administrator with Base44 user role can prepare',{},prepare,({status,data})=>{assert.equal(status,200);assert.equal(data.access.active,false);assert.equal(data.access.activation_version,2);});
await run('regular user cannot spoof admin from request',{adminRole:{can_admin:false}}, {...prepare,role:'admin',form:{...prepare.form,can_admin:true}},({status,writes})=>{assert.equal(status,403);assert.equal(writes.length,0);});
await run('disabled role cannot authorize',{adminRole:{active:false}},prepare,({status})=>assert.equal(status,403));
await run('pending admin account cannot authorize',{adminAccess:{password_setup_required:true}},prepare,({status})=>assert.equal(status,403));
await run('suspended admin cannot authorize',{adminAccess:{active:false}},prepare,({status})=>assert.equal(status,403));
await run('technical administrator is supported',{caller:{role:'admin'},noAccess:true},prepare,({status})=>assert.equal(status,200));
await run('legacy administrator remains supported',{adminAccess:{role:'Administrador',role_ids:[]}},prepare,({status})=>assert.equal(status,200));
const existing={id:'target',staff_id:'staff',user_email:'old@example.test',active:true,password_setup_required:false,invitation_status:'active'};
await run('editing preserves identity and activation',{existing},{...prepare,accessId:'target',form:{...prepare.form,user_email:existing.user_email,active:false,password_setup_required:true}},({status,writes,data})=>{assert.equal(status,200);assert.equal(data.access.active,true);assert.equal(data.access.password_setup_required,false);assert.equal(writes[0].active,undefined);assert.equal(writes[0].user_email,undefined);});
await run('email changes are refused',{existing},{...prepare,accessId:'target'},({status,writes})=>{assert.equal(status,400);assert.equal(writes.length,0);});
await run('duplicate staff does not create another account',{existing},prepare,({status,writes})=>{assert.equal(status,409);assert.equal(writes.length,0);});
await run('cannot suspend self',{}, {action:'set-active',accessId:'manager',form:{active:false}},({status,writes})=>{assert.equal(status,409);assert.equal(writes.length,0);});
console.log(`${count} authorization scenarios passed; simulated records only.`);

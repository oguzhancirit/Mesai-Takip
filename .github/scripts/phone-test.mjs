// No stored secret: only this fork/test branch's short-lived GitHub OIDC identity.
const origin='https://mesai-takip-bildirimler.ozicirit9.chatgpt.site';
const api=origin+'/api/notifications';
async function get(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r;}
try{
 const config=await get(api+'/config',{headers:{Origin:'https://oguzhancirit.github.io'}});
 if(config.headers.get('access-control-allow-origin')!=='https://oguzhancirit.github.io')throw Error('Test CORS mismatch');
 if(typeof (await config.json()).publicKey!=='string')throw Error('Push key unavailable');
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',origin);
 const identity=await (await get(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}})).json();
 const result=await (await get(api+'/dispatch-test',{method:'POST',headers:{Authorization:'Bearer '+identity.value}})).json();
 console.log(new Date().toISOString(),'Telefon testi',JSON.stringify({sent:result.sent,failed:result.failed,expired:result.expired}));
}catch(e){console.error('Telefon testi başarısız:',e.message);process.exitCode=1;}

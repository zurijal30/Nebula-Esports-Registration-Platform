const origin=process.env.TEST_BASE_URL||'http://localhost:3000';
const id='99999999-9999-4999-8999-999999999999';
const url=`${origin}/admin/exports/events/${id}`;
const response=await fetch(url,{redirect:'manual'});
if(response.status!==401&&!(response.status>=300&&response.status<400&&response.headers.get('location')?.includes('/sign-in')))throw Error('Anonymous download was not rejected');
if(!response.headers.get('cache-control')?.includes('no-store'))throw Error('Download rejection is missing no-store');
console.log('Anonymous Excel download denied; response is not cached. No private data requested.');

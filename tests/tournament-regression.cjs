// Run: node tests/tournament-regression.cjs
// No external packages are required. Runs the actual inline application logic in a VM.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  .split('    $("addPlayer").addEventListener')[0];

function test(n, courts, rounds, rated, pairs, absent = []) {
  const context = vm.createContext({ console, Date, performance });
  vm.runInContext(source, context);
  const params = JSON.stringify({n,courts,rounds,rated,pairs,absent});
  const script = `(() => {
    const {n,courts,rounds,rated,pairs,absent} = ${params};
    let seed = 20261021;
    Math.random = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };
    appSettings.competitionMode='tournament'; appSettings.useRatings=rated;
    members=Array.from({length:n},(_,i)=>({id:String(i),name:'P'+i,rating:rated? (3+i%6):null}));
    fixedPairs=pairs.map(pair=>pair.map(String));
    const working=cloneStatePlayers(members.filter(p=>!absent.includes(+p.id)));
    const quartets=new Map(), matchups=new Map();
    const schedule=[];
    const restEvents=new Map(working.map(p=>[p.id,[]]));
    let maxRoundlyRestGap=0;
    for(let round=1;round<=rounds;round++){
      const usableCourts=Math.min(courts,Math.floor(working.length/4));
      const result=chooseTournamentRound(working,usableCourts,round,quartets,matchups);
      if(!result)throw Error('no round');
      const used=new Set();
      for(const m of result.matches){
        if(m.teamA.length!==2||m.teamB.length!==2)throw Error('invalid doubles match');
        for(const p of m.players){if(used.has(p.id))throw Error('duplicate player');used.add(p.id);}
        recordHistory(m.teamA,m.teamB,round);
        recordQuartetHistory(m.teamA,m.teamB,round,quartets);
        recordTournamentMatchup(m.teamA,m.teamB,round,matchups);
        for(const p of m.players)p.played++;
      }
      for(const p of working){
        p.lastRest=!used.has(p.id);
        if(p.lastRest){ p.rested++; p.lastRestRound=round; restEvents.get(p.id).push(round); }
      }
      const counts=working.map(p=>p.rested);
      const currentGap=Math.max(...counts)-Math.min(...counts);
      maxRoundlyRestGap=Math.max(maxRoundlyRestGap,currentGap);
      if(currentGap>1)throw Error('rest imbalance at round '+round+': '+currentGap);
      for(const [a,b] of fixedPairs){
        if(!used.has(a)||!used.has(b))continue;
        if(!result.matches.some(m=>
          m.teamA.some(p=>p.id===a)&&m.teamA.some(p=>p.id===b)||
          m.teamB.some(p=>p.id===a)&&m.teamB.some(p=>p.id===b)))throw Error('fixed pair was split');
      }
      if(used.size!==usableCourts*4||result.rests.length!==working.length-used.size)throw Error('wrong attendance');
      schedule.push(result);
    }
    const slots=Math.min(courts,Math.floor(working.length/4))*4;
    const restPerRound=working.length-slots;
    const firstCycle=restPerRound>0?Math.ceil(working.length/restPerRound):Infinity;
    const firstRestMax=restPerRound>0&&rounds>=firstCycle
      ? Math.max(...[...restEvents.values()].map(events=>events[0]??Infinity)):null;
    const largestRestInterval=Math.max(0,...[...restEvents.values()].flatMap(events=>events.slice(1).map((r,i)=>r-events[i])));
    const maxConsecutivePlay=Math.max(...[...restEvents.values()].map(events=>{
      let last=0, most=0;
      for(const round of [...events,rounds+1]){most=Math.max(most,round-last-1);last=round;}
      return most;
    }));
    return {games:schedule.length,restGap:Math.max(...working.map(p=>p.rested))-Math.min(...working.map(p=>p.rested)),
      maxRoundlyRestGap,firstRestMax,firstCycle,largestRestInterval,maxConsecutivePlay,
      singleRest: schedule.some(r=>r.rests.some(p=>fixedPairs.some(pair=>pair.includes(p.id)&&pair.some(other=>other!==p.id&&!r.rests.some(x=>x.id===other)))))};
  })()`;
  return vm.runInContext(script,context,{timeout:90000});
}

const cases = [
  [4,1,10,false,[[0,1],[2,3]]],
  [9,2,12,false,[[0,3],[4,5]]],
  [9,2,12,true,[[0,3],[4,5]]],
  [14,3,21,false,[[0,1],[2,3],[4,5],[6,7],[8,9]]], // 5 fixed pairs + 4 free, 2 rests each round
  [14,3,21,true,[[0,1],[2,3],[4,5],[6,7],[8,9]]],
  [14,2,16,false,[[0,1],[2,3],[4,5],[6,7],[8,9]]],
  [12,2,18,false,[[0,3],[4,5]]],
  [12,2,18,true,[[0,3],[4,5]]],
  [16,3,15,false,[[0,3],[4,5],[6,7]]],
  [20,5,10,true,[[0,3],[4,5],[6,7]]],
  [50,5,8,false,[[0,3],[4,5],[6,7]]],
  [10,2,8,false,[[0,3],[4,5]],[3]], // one registered partner absent
];
for (const args of cases) {
  const result = test(...args);
  assert.equal(result.games,args[2]);
  assert.ok(result.restGap<=1, `Uneven resting: ${result.restGap}`);
  assert.ok(result.maxRoundlyRestGap<=1, `Resting temporarily uneven: ${result.maxRoundlyRestGap}`);
  if(result.firstRestMax!==null) assert.ok(result.firstRestMax<=result.firstCycle,
    `First rest too late: round ${result.firstRestMax}, expected by round ${result.firstCycle}`);
  if(args[0]===14 && args[1]===3) {
    assert.ok(result.largestRestInterval<=7, `Rest spacing too long: ${result.largestRestInterval}`);
    assert.ok(result.maxConsecutivePlay<=6, `Played too many consecutive games: ${result.maxConsecutivePlay}`);
  }
  if(args[0]===9) assert.ok(result.singleRest,'Registered pair must be allowed to rest separately');
  console.log(`PASS: ${args[0]} players, ${args[1]} courts, ${args[2]} rounds, ratings=${args[3]}, rest-gap=${result.restGap}, first-rest-last=${result.firstRestMax}, max-play-streak=${result.maxConsecutivePlay}`);
}
// Smoke-test the unchanged normal-mode generator with ratings on and off.
for (const rated of [false,true]) {
  const context=vm.createContext({console, Date, performance});
  vm.runInContext(source,context);
  const played=vm.runInContext(`(() => {
    appSettings.competitionMode='normal'; appSettings.useRatings=${rated};
    let m=Array.from({length:8},(_,i)=>({id:String(i),name:'P'+i,rating:3+i%5}));
    let st=cloneStatePlayers(m);
    let result=chooseRoundMatches(st,2,1,8,new Map());
    return {courts:result.length,unique:new Set(result.flatMap(c=>c.players.map(p=>p.id))).size};
  })()`,context,{timeout:20000});
  assert.equal(played.courts,2); assert.equal(played.unique,8);
  console.log('PASS: unchanged normal mode, ratings='+rated);
}
console.log('All regression tests passed.');

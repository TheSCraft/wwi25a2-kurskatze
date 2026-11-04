import type {Data} from "../../lib/cat-types";

type Props={data:Data;busy:boolean;onRevive:()=>void;onLogin:()=>void};

export function RevivalPanel({data,busy,onRevive,onLogin}:Props){
 return <section className="revival"><h3>Gemeinsam zurückholen</h3><p aria-live="polite">{data.revival.fed} von {data.revival.total} Portionen sind im Napf.</p><button className="save" disabled={busy||!!data.revival.contributed||(data.account&&!data.revival.eligible)} onClick={()=>data.account?onRevive():onLogin()}>{data.revival.contributed?"Deine Portion ist im Napf ✓":data.account&&!data.revival.eligible?"Ab der nächsten Runde dabei":data.account?"Meine Portion füttern":"Zum Füttern anmelden"}</button><p>Es zählen die Konten, die beim Verhungern schon dabei waren. Mit der letzten Portion wacht Byte wieder satt auf.</p></section>;
}

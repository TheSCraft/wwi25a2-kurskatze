import {sql} from "./db";
import {hungerExtra,settleStep,sulkGrace} from "../mood";

// Rechnet den zusätzlichen Hunger ab, solange Byte länger als die Schutzfrist ganz ohne Zuneigung ist:
// Zeit seit max(Zuneigung-0 + Schutzfrist, letzte Aktion, letzte Abrechnung), davon der Anteil `hungerExtra`.
// Läuft nur bei lebendem Byte und frühestens nach `settleStep` (höchstens ~1.440 Schreibzugriffe pro Tag, eine obere Schranke).
// Zusätzlicher Hunger nach einem natürlichen Ablauf (niemand hat abgefragt) wird nicht nachgerechnet, zugunsten der Spielenden.
// Muss als erste Anweisung eines Batches stehen, damit Tod und Cooldown-Prüfung den neuen Wert sehen.
export const settleSql="UPDATE cat SET food_expires=food_expires-CAST(? * (?-max(love+?,COALESCE(active,0),COALESCE(settled,0))) AS INTEGER),settled=? WHERE id=1 AND food_expires>? AND ?-max(love+?,COALESCE(active,0),COALESCE(settled,0))>=?";
export const settleStatement=(now:number)=>sql(settleSql,hungerExtra,now,sulkGrace,now,now,now,sulkGrace,settleStep);

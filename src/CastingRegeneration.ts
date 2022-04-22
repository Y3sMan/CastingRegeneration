import * as sp from "skyrimPlatform";

let i = 0;
let bcastingstart = false;
let bcastinghold = false;
let bconcstart = false;
let frestorerate = 0;
let bConc = false

function player() {
	return sp.Game.getPlayer();
}
/* 
	AV rates are weird;
	calculating one, I believe, can be done as follows:
		Attribute * (Rate * RateMulti)
	Only, the RateMulti changes whether the actor is in combat or not, and the combat RateMulti is a GameSetting vs. an Actor Value (why though?)
*/
function castrestore() {		
	const iPercent = (sp as any).MCM.GetModSettingInt("CastingRegeneration", "iRegenPercent:Main") / 100;
	const frate = player().getActorValueMax("magicka") * player().getActorValue("magickarate") * iPercent / 100;
	frestorerate = frate * player().getActorValue("magickaratemult") / 100 / 60
	if (player().isInCombat()){frestorerate = frestorerate * sp.Game.getGameSettingFloat("fCombatMagickaRegenRateMult")};
	player().restoreActorValue("magicka", frestorerate);
	if (bcastingstart){i++;}; // countdown when SpellAimedStart animation starts but only increment as mana is restored; helps with really low restorerates 
}


sp.hooks.sendAnimationEvent.add({
	enter(ctx) {
		// sp.printConsole(ctx.animEventName);
		if (ctx.animEventName == "MRh_SpellAimedStart" || ctx.animEventName == "MLh_SpellAimedStart" || ctx.animEventName == "DualMagic_SpellAimedStart" ) {
			i = 0
			bcastingstart = true // the animation has started
		};
		if (bConc){
			if (ctx.animEventName == "MRh_SpellAimedConcentrationStart" || ctx.animEventName == "MLh_SpellAimedConcentrationStart" || ctx.animEventName == "DualMagic_SpellAimedConcentrationStart"){
				i = 0;
				bcastingstart = true;
				bconcstart = true;
			};
		};
	},
	leave(ctx) {
		if (ctx.animEventName == "MRh_SpellRelease_Event" || ctx.animEventName == "MLh_SpellRelease_Event" ) {
			bcastinghold = false
			bcastingstart = false
		}
		if (ctx.animEventName == "MRh_Equipped_Event" && bconcstart || ctx.animEventName == "MLh_Equipped_Event" && bconcstart){
			bcastinghold = false
			bcastingstart = false
			bconcstart = false
		}
	}
},  0x14, 0x14); // filter out non-player events



sp.on('update', () => {
	bConc = (sp as any).MCM.GetModSettingBool("CastingRegeneration", "bConc:Main");
	let fDelay = (sp as any).MCM.GetModSettingFloat("CastingRegeneration", "fInitialDelay:Main") * 60;
	let fCutoff = ((sp as any).MCM.GetModSettingFloat("CastingRegeneration", "fCutoff:Main") * 60);
	if (fCutoff > 0){fCutoff = fCutoff + fDelay;}
	if ( sp.Utility.isInMenuMode() ) { return; }
	if (bcastingstart && !bcastinghold){i++;};
	if (i >= fDelay && bcastingstart){bcastinghold = true;}
	if (i >= fCutoff && fCutoff > 0){bcastinghold = false; bcastingstart = false; i = 0;} // after certain time, stop restoring mana; 60 = 1 second
	if (bcastinghold) {castrestore();} // restore mana if holding the SpellAimedStart animation
});


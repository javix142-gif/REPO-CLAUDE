// Story content of "Umbral de Ceniza": chapters, stage introductions, diary (lore) entries and endings.
// All texts are original. Lines are wrapped by hand (about 44 characters per line in the menu panel).
//
// World: Villa Ceniza stands over the Umbral, a gate to the Abyss that the Order of the Ember kept closed with the
// Eternal Flame. The Flame died out, ash falls from the sky and the dead rise. The hero is the last Ember-bearer.

export const CAPITULOS = [
  { nombre: "Catacumbas Olvidadas", tema: "mazmorra", desde: 1, hasta: 4 },
  { nombre: "Fortaleza Carmesí", tema: "fortaleza", desde: 5, hasta: 8 },
  { nombre: "Abismo de Cristal", tema: "abismo", desde: 9, hasta: 12 },
];
export const NUM_ETAPAS = 12;

/** Name and kind of the stage boss (last room). "kind" is the enemy Tipo; elite = a scaled-up normal enemy. */
export const JEFES = [
  null,
  { nombre: "Grom, el Devorador", tipo: "Bruto", elite: true },
  { nombre: "Osvaldo el Insomne", tipo: "Esqueleto", elite: true },
  { nombre: "Hermana Vesper", tipo: "Cultista", elite: true },
  { nombre: "CABALLERO DE CENIZA", tipo: "Jefe", elite: false },
  { nombre: "La Dama de los Lamentos", tipo: "Espectro", elite: true },
  { nombre: "Halcón Sangriento", tipo: "Arquero", elite: true },
  { nombre: "Verdugo Carmesí", tipo: "Bruto", elite: true },
  { nombre: "REINA CARMESÍ", tipo: "Reina", elite: false },
  { nombre: "Rey Gelatina", tipo: "Limo", elite: true },
  { nombre: "Custodio de Piedra", tipo: "Golem", elite: true },
  { nombre: "Sombra del Umbral", tipo: "Espectro", elite: true },
  { nombre: "COLOSO DEL UMBRAL", tipo: "Coloso", elite: false },
];

/** Enemy mix per stage: 20 slots (each slot = 5%). */
export function pool(etapa) {
  const mk = (o) => Object.entries(o).flatMap(([t, n]) => Array(n).fill(t));
  let o;
  if (etapa === 1) o = { Esqueleto: 13, Murcielago: 7 };
  else if (etapa === 2) o = { Esqueleto: 10, Murcielago: 5, Cultista: 5 };
  else if (etapa === 3) o = { Esqueleto: 7, Murcielago: 4, Cultista: 4, Arquero: 5 };
  else if (etapa === 4) o = { Esqueleto: 6, Murcielago: 4, Cultista: 3, Arquero: 4, Bruto: 3 };
  else if (etapa <= 6) o = { Esqueleto: 3, Arquero: 4, Cultista: 3, Espectro: 4, Bruto: 4, Murcielago: 2 };
  else if (etapa <= 8) o = { Esqueleto: 2, Arquero: 4, Cultista: 3, Espectro: 5, Bruto: 4, Murcielago: 2 };
  else o = { Golem: 5, Limo: 6, Espectro: 4, Cultista: 2, Bruto: 1, Arquero: 2 };
  return mk(o);
}

/** One letter per enemy type: the pool of a stage is a 20-letter string (Relato.Pool[etapa]). */
export const CODIGOS = { Esqueleto: "E", Murcielago: "M", Cultista: "C", Arquero: "A", Bruto: "B", Espectro: "S", Golem: "G", Limo: "L" };
export const poolString = (etapa) => pool(etapa).map((t) => CODIGOS[t]).join("");

export const PROLOGO = "Villa Ceniza se levanta sobre el Umbral,\nla puerta que separa este mundo del Abismo.\nLa Orden de la Brasa la mantuvo cerrada\ncon la Llama Eterna... hasta que se apagó.\n\nAhora la ceniza cae del cielo y los muertos\nsalen a caminar. Tú eres la última\nportadora de la Brasa: baja y vuelve\na encender la Llama.";

/** Story page shown the first time you enter each stage (index = stage). */
export const INTROS = [
  "",
  "CATACUMBAS OLVIDADAS\n\nBajo la villa duermen los caballeros de la\nOrden. La ceniza los ha despertado.\nAbre camino sala a sala; un devorador de\nhuesos ronda las criptas.",
  "Las velas de las criptas arden solas.\nHuele a incienso y a ceniza fría.\n\nAlguien reza al fondo: el Culto de la Ceniza\nquiere el Umbral abierto. Un capitán sin\nsueño guarda la cripta.",
  "Los cultistas traman desde las sombras.\nSus arqueros de hueso te vigilan desde\nlas repisas: sube tras ellos.\n\nLa hermana Vesper dirige el rezo.\nHay que callarla.",
  "CRIPTA DEL CABALLERO\n\nAl final de las catacumbas espera Sir Aldric,\nel último comandante de la Orden. La ceniza\nle ha consumido la voluntad, pero su espada\nsigue recordando el juramento.",
  "FORTALEZA CARMESÍ\n\nMás allá de las criptas se alza la fortaleza\nde la reina Isaura, que pactó con la ceniza\npara no morir. Sus salones aún gotean rojo.\nLos ecos de sus damas no descansan.",
  "Los halcones de la reina vigilan cada torre.\nSus flechas nunca fallan... casi nunca.\nUsa las plataformas y acaba con ellos desde\narriba antes de que te rodeen.",
  "Los muros de la fortaleza susurran.\nLos espectros atraviesan la piedra y se\nmueven cuando no los miras.\n\nEl verdugo de la reina guarda la puerta\ndel trono.",
  "SALA DEL TRONO\n\nIsaura te espera sentada en un trono de\nsangre seca. Ya no es una mujer: es hambre\ncon corona. Si cae, el camino al Umbral\nquedará libre.",
  "ABISMO DE CRISTAL\n\nEl Umbral se abre a una cueva de cristales\nque cantan bajo tus pies. Aquí la ceniza\ntiene forma: limos que se dividen y\ngolems que despiertan al pisarlos.",
  "El cristal refleja lo que temes.\nLos limos se parten en dos cuando los\nhieres: golpea fuerte y de una vez.\n\nEl Rey Gelatina custodia este piso.",
  "Los custodios de piedra fueron los primeros\nguardianes del Umbral. Nadie les dijo que\nla Orden había caído.\n\nNo sienten dolor; sí sienten la ceniza.",
  "CORAZÓN DEL UMBRAL\n\nEl Coloso duerme sobre la puerta misma.\nSi lo derrotas, la Llama Eterna podrá\nvolver a encenderse... o el Abismo\nse quedará con tu Brasa.",
];

/** Story page shown after beating the chapter boss (stages 4, 8 and 12). */
export const FINALES = {
  4: "SIR ALDRIC DESCANSA\n\nAl caer, el yelmo se abre: bajo él sólo hay\nun rostro cansado que susurra «gracias».\nSu espada se convierte en cenizas y una\nescalera desciende hacia la fortaleza.",
  8: "ISAURA SE APAGA\n\nLa corona rueda por el suelo y se hace\npolvo. Isaura sonríe por primera vez en\nsiglos. Detrás del trono, el Umbral late\ncomo un corazón enorme.",
  12: "LA LLAMA VUELVE\n\nEl Coloso se desmorona y, en su pecho,\narde una brasa dorada. La tomas y la\nllevas a la villa: la Llama Eterna vuelve a\nencenderse y el Umbral se cierra.\n\nLa ceniza deja de caer... pero el Abismo\nno olvida. Sigue el Coliseo de la Ceniza.",
};

/** Diary entries: entry N (1..12) is unlocked when Save.EtapaMax >= N; entry 0 is always available. */
export const DIARIO = [
  ["La villa bajo la ceniza", "Villa Ceniza se levanta sobre el Umbral, la\npuerta entre este mundo y el Abismo. La\nOrden de la Brasa la cerró hace siglos con\nla Llama Eterna. Se apagó, y desde entonces\nla ceniza cae del cielo."],
  ["Las catacumbas", "Bajo la villa yacen los caballeros de la\nOrden. Cuando la ceniza los toca, se\nlevantan sin descanso. Brenna, la herrera,\nafirma que reconoce el acero de sus\nespadas."],
  ["El Culto de la Ceniza", "Un culto reza para que el Umbral se abra.\nCreen que el Abismo les devolverá a sus\nmuertos. Ilse, la alquimista, ha visto\nsus marcas en las paredes: un anillo con\nuna grieta."],
  ["La hermana Vesper", "Vesper fue sanadora de la villa. Perdió a\nsu hija en la primera lluvia de ceniza y\nfue la primera en escuchar la voz del\nUmbral. Sus orbes no curan: consumen."],
  ["Sir Aldric", "Aldric, comandante de la Orden, se quedó\nguardando la puerta cuando todos huyeron.\nLa ceniza le devoró la mente, no el honor:\nsigue impidiendo el paso, incluso a ti."],
  ["Fortaleza Carmesí", "La reina Isaura ofreció su reino a la ceniza\na cambio de no morir. Sus muros sudan\nsangre y sus torres nunca se apagan.\nNadie sabe cuántas damas la sirven aún."],
  ["Los halcones de la reina", "Los arqueros de Isaura eran los mejores\ndel reino. Ahora sólo son huesos y puntería.\nDisparan desde lo alto: quien domine las\nplataformas dominará la fortaleza."],
  ["Ecos y espectros", "Los espectros son los recuerdos de quienes\nmurieron en la fortaleza. Aparecen y\ndesaparecen porque ni ellos saben si\nsiguen vivos. Sus lamentos hieren."],
  ["Isaura", "La reina no quería poder, sólo tiempo para\nver crecer a su hija. La ceniza se lo dio\ny se llevó todo lo demás. Detrás de su\ntrono, el Umbral late como un corazón."],
  ["Más allá del Umbral", "El Abismo de Cristal no es un infierno: es\nun espejo. Los cristales guardan el eco de\ntodo lo que la ceniza ha tocado. Caminar\nsobre ellos suena a campanas rotas."],
  ["Limos de cristal", "Los limos nacieron de las lágrimas de\nquienes cruzaron el Umbral. Se dividen\ncuando los hieren: cuanto más fuerte el\ngolpe, menos pedazos quedan."],
  ["Custodios de piedra", "Los primeros guardianes del Umbral, tallados\npor la Orden. Siguen obedeciendo una orden\nque nadie recuerda: nadie pasa. No odian;\ncumplen."],
  ["El Coloso del Umbral", "El Coloso es el corazón de piedra de la\npuerta. Guarda la última brasa de la Llama\nEterna. Para volver a encenderla hay que\nvencerlo... y no dejar que el Abismo\napague tu Brasa."],
];

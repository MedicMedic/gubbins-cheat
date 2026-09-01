# Gubbins Cheat — Project Notes

## Wordlist source of truth (official game dictionary)

As of 2026-07-02, `wordlist.js` is generated directly from the game's own dictionary
(474,370 words, lengths 2–9 — the game does not validate longer words, so the length
selector only offers 2–9). This is the authoritative list of what the game accepts, so
it supersedes manual curation. The blacklist below is retained as history; nearly all of
it (514/516) is absent from the official list, confirming those removals were correct.

### How to refresh it

The dictionary is a remote Unity Cloud Content Delivery (CCD) AssetBundle, downloaded by
the app on launch. To pull and regenerate:

1. Pull the app's Addressables config to get the CCD environment/bucket/badge:
   `com.StudioFolly.GUBBINS` → `assets/aa/settings.json` (`m_CcdManagedData`) and
   `assets/aa/catalog.json` (bundle path `dictionaries_assets_wordmanager.bundle`).
2. Fetch the bundle (follow the 307 redirect; `curl -L` mishandles the `%25` in the
   Location, so use Python `urllib`):
   `https://d5f581d4-4dc5-458a-980a-1287c5a7f453.client-api.unity3dusercontent.com/client_api/v1/environments/dev/buckets/48d9bd7d-2c77-4798-b58c-922156393430/release_by_badge/latest/entry_by_path/content/?path=/dictionaries_assets_wordmanager.bundle`
3. Parse with UnityPy: the `Word ManagerAddressable` MonoBehaviour's `WordCache` holds
   `Length2`…`Length9` string arrays. Lowercase, dedupe, sort by (length, word), emit as
   `const WORD_LIST = [ ... ];`.

(env=`dev`, bucket=`48d9bd7d-2c77-4798-b58c-922156393430`, badge=`latest` may change with
game updates — re-read `settings.json` from a freshly pulled APK if the fetch 404s.)

## Game art (pencil.png)

`pencil.png` is the actual in-game pencil gubbin sprite (`Gubbin_Pencil_Small_Idle_0001Sprite`),
extracted 2026-09-01. The game's art is SVG-imported **vector sprites** (tessellated meshes with
per-vertex colors, no Texture2D), so UnityPy's `.image` fails with `PPtr ... m_PathID == 0`.
To extract more art:

1. Pull the APK splits over adb (`adb shell pm path com.StudioFolly.GUBBINS`, then `adb pull`).
   Sprites live in `split_UnityDataAssetPack.apk` → `assets/bin/Data/datapack.unity3d`.
2. Load with UnityPy, find the Sprite by name, and read its typetree: positions are float3 in
   vertex stream 0, RGBA8 color + float2 UV in stream 1. **Stream 1 starts 16-byte-aligned after
   stream 0** (`(n*12 + 15) & ~15`) — without the alignment the colors come out white/shifted.
3. Rasterize the `m_IndexBuffer` (uint16) triangles with each triangle filled by its first
   vertex's color (shapes are solid-colored), flipping Y. Supersample 4x, then downscale.

Other pencil frames and every other gubbin (`Gubbin_*_Small_Idle_*Sprite`, etc.) extract the
same way.

## Word Blacklist

These 9-letter words have been intentionally removed and must **not** be re-added to `wordlist.js`.

### Removed 2026-06-19

```
alkhimovo  aquagreen  asterioid  avicebron  beastbane  bemitered  bephilter
besotment  blebbings  borderism  bowdichia  breakover  bunodonta  canvasado
carewares  coldblood  coronetty  crowdweed  daytalers  demipagan  demiveges
dressline  effierces  enfierces  enraunges  estantion  fanneling  flenchers
gasperoni  hematoses  ingeniary  intercale  japhetide  kaliphate  mancipium
marrietta  masscults  ottoville  ottsville  overliing  peggymast  preesteem
priesteen  redistend  rostrular  schvartze  schwartze  sherlocke  spokester
steelbows  subradial  superdebt  tetrapoda  trevallys  trictracs  unpermits
walkerite  wildhorse
```

### Removed 2026-06-14

```
adderfish  alsophila  anamelech  anthraces  antimesia  barnstead  birdsboro
blindheim  bloodripe  bockstein  bolderian  boodledom  boonsboro  brasquing
bucerotes  bucuresti  calothrix  centraler  centrales  cockneity  collotypy
columneas  cursement  daedalist  detraques  doorpiece  emmensite
emusified  exajoules  fibrocyst  fictation  forjesket  forjeskit  frowsters
gospelist  hemimerus  henlawson  impollute  kensitite  ketolyses  lemmocyte
mahalamat  maidhoods  moschidae  moschinae  nicotians  outflunky  outjetted
outstrive  outstrove  oversadly  pembrokes  penneechs  phacelite  placoidei
pockmanky  pomatomus  preadvise  predenial  psilocins  quadrator  quantally
recedence  remigated  repremise  restingly  skylounge  sleepyeye  spanpiece
sparpiece  squareage  squireage  stageably  sugillate  taxeopoda  taxeopody
tenthredo  teodorico  thranitic  trashrack  tricrural  tsiltaden  uberously
unerrancy  unnibbied  unshowily  unspicily  untrouble  urophaein  usquabaes
usquebaes  watchfree  wellqueme  witchedly  woolwheel
```

### Removed this session (2026-05-28)

```
alcyoneus  ascophore  backframe  beswelter  bisquette  bizardite  blanketer
brownweed  browpiece  bummerish  calypsist  camleteen  cedreatis  chicquing
cloudship  conquians  corblimey  dedolency  dembowski  embolemia  englifier
enspangle  farinosel  flabbella  flunkyite  gemmipara  glenolden  grainsick
grainsman  harshweed  homefolks  hypoergic  impriment  isophanal  jamesburg
jointwood  kedushoth  loudspeak  maharawal  maharawat  megalaema  mismingle
momiology  outchides  outsuitor  overclasp  oxygonial  paddybird  perameles
persicize  planterly  postaxiad  proofness  pulsellum  quintessa  refixture
removedly  salleeman  screwship  shellblow  siganidae  siwashing  solenidae
soupieres  spelaites  spinebone  subbromid  sutherlan  tartishly  tourmente
tradiment  trilobita  unflatted  unrevenue  unstagily  unstonily
```

### Removed 2026-06-03

```
acuductor  afterfame  afterturn  aleyrodes  alisonite  amphitron  archfelon
archthief  beaverism  beshackle  biasteric  binapthyl  birchdale  bootleger
branchman  bullyisms  bundwalls  bungwalls  calctufas  calmstane  champiest
chaussees  cheiceral  chilopoda  circassic  cladocera  coelector  coembrace
colonaded  coronises  crooisite  detraquee  dmitrevsk  dogwinkle  dragstaff
dumbshows  elaterist  entempest  environic  erugatory  escapeful  fiberfrax
filicales  footmaker  forhailed  gallywasp  gemitores  greenwort  hashimite
heartward  hollytree  impicture  jookeries  joukeries  jumillite  justments
kaneshite  keratocni  kurveyors  larcenish  leechburg  leesomely  logandale
looksisms  mallechos  membrally  metership  mitchiner  molesting  muskified
myriadths  natalbany  origenize  outragely  outstated  outwicked  palaquium
pardubice  parulises  pearlbird  pernettia  petrolage  pluckemin  predetail
predetain  predriven  predriver  preequity  preholder  presuffer  pulpstone
rabbinics  railwayed  riverwash  scotchery  semipedal  shawville  sheetling
slinkweed  sloomiest  squabbest  stradella  strontias  subplexal  subpoenal
sympathic  tetralite  ticklaces  tictacked  tremoloso  triosteum  unfeastly
viritrate  wevertown  widewhere
```

### Removed in earlier commits (git history)

```
airplaner  aleknagik  alphonist  anammonid  angadreme  anglepods  aromacity
atticised  aureously  autopoint  backstrip  barleducs  baskonize  belection
bemajesty  beworship  bezesteen  bicarbide  blooddrop  boyertown  breezeful
brindlish  brookiest  brookview  buttstrap  camphanyl  cannabins  capeworks
cephalata  cessantly  chantages  checkline  chiefland  chilotomy  civicisms
cleopatre  cloverlay  clupeodei  coordinal  corejoice  craspedum  crosspath
crossweed  cynareous  dainteous  dameworts  decempeda  dedolence  deerstand
deeryards  demijambe  dendrodic  derbyline  dextorsal  diamylose  dichelyma
drawpoint  dreamtide  dryfarmer  dudleyite  dummyweed  effoliate  eglanteen
enddamage  ethylamin  exibilate  favoredly  fevertwig  firstship  flaxwench
flebotomy  florilage  fluxmeter  foreflank  frithwork  gaugeably  gorsebird
gwendolin  halachist  halysites  hamlinite  hartungen  hoopmaker  hopestill
hudsonite  humilific  ickesburg  importray  infrapose  inghilois  intermeet
islandmen  isobornyl  jarovized  jawfooted  jawlensky  justicies  kankedort
kneebrush  kunstlied  lippering  liverance  longheads  luxuriety  lyomerous
mankeeper  metrocele  mitnagged  moonshade  morchella  munichism  nonastral
operabily  outbanter  outvanish  patchleaf  pectinous  pererrate  plainback
plenarium  polydermy  postcecal  preacquit  preadhere  preposter  prequoted
provingly  pyoureter  queintise  ribbandry  royalmast  rubbishry  rytidosis
sampleman  sawsetter  scrivenly  semitelic  semplices  shamesick  shammashi
shawanese  sideritis  sklenting  skunkbill  solidillu  solvabled  sporozoal
stechhelm  stenterer  sweepiest  tacheture  tenstrike  teutophil  thegether
trolleyer  undereyed  unfacaded  unfrizzly  unprobity  unslicked  unstoutly
untensely  untersely  unthickly  unwasheds  viperinae  wawarsing  weeksbury
wellaways  whitfinch
```

// prisma/seed-hsn.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hsnCodes = [
  // ==========================================
  // CHAPTER 25: SALT; SULPHUR; EARTHS & STONE; PLASTERING MATERIALS, LIME & CEMENT
  // ==========================================
  { code: "2523", description: "Portland cement, aluminous cement, slag cement", chapter: "25", section: "Construction Materials", gstRate: 28 },
  { code: "2517", description: "Pebbles, gravel, broken or crushed stone for concrete aggregates", chapter: "25", section: "Construction Materials", gstRate: 5 },
  { code: "2516", description: "Granite, porphyry, basalt, sandstone and other monumental or building stone", chapter: "25", section: "Construction Materials", gstRate: 5 },
  { code: "2520", description: "Gypsum; anhydrite; plasters consisting of calcined gypsum", chapter: "25", section: "Construction Materials", gstRate: 18 },
  { code: "2521", description: "Limestone flux; limestone and other calcareous stone", chapter: "25", section: "Construction Materials", gstRate: 5 },
  { code: "2515", description: "Marble, travertine, ecaussine and other calcareous monumental or building stone", chapter: "25", section: "Construction Materials", gstRate: 12 },
  { code: "2508", description: "Other clays, andalusite, kyanite, sillimanite, mullite, chamotte or dinas earths", chapter: "25", section: "Construction Materials", gstRate: 5 },
  { code: "2505", description: "Natural sands of all kinds, whether or not coloured", chapter: "25", section: "Construction Materials", gstRate: 5 },
  { code: "2506", description: "Quartz (other than natural sands); quartzite", chapter: "25", section: "Construction Materials", gstRate: 5 },
  
  // ==========================================
  // CHAPTER 38: MISCELLANEOUS CHEMICAL PRODUCTS (Construction chemicals)
  // ==========================================
  { code: "3824", description: "Prepared binders for foundry moulds or cores; chemical products for construction", chapter: "38", section: "Construction Chemicals", gstRate: 18 },
  { code: "3816", description: "Refractory cements, mortars, concretes and similar compositions", chapter: "38", section: "Construction Chemicals", gstRate: 18 },
  { code: "3820", description: "Anti-freezing preparations and prepared de-icing fluids", chapter: "38", section: "Construction Chemicals", gstRate: 18 },
  { code: "3809", description: "Finishing agents, dye carriers to accelerate dyeing or fixing of dyestuffs", chapter: "38", section: "Industrial Chemicals", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 39: PLASTICS AND ARTICLES THEREOF (PVC pipes, fittings, insulation)
  // ==========================================
  { code: "3917", description: "Tubes, pipes and hoses, and fittings therefor of plastics", chapter: "39", section: "Plastic Products", gstRate: 18 },
  { code: "3916", description: "Monofilament of which any cross-sectional dimension exceeds 1mm, rods, sticks of plastics", chapter: "39", section: "Plastic Products", gstRate: 18 },
  { code: "3925", description: "Builders' ware of plastics, not elsewhere specified (doors, windows, shutters)", chapter: "39", section: "Construction Materials", gstRate: 18 },
  { code: "3926", description: "Other articles of plastics (cable ties, fasteners, clamps, seals)", chapter: "39", section: "Plastic Products", gstRate: 18 },
  { code: "3920", description: "Other plates, sheets, film, foil and strip of plastics", chapter: "39", section: "Plastic Products", gstRate: 18 },
  { code: "3918", description: "Floor coverings of plastics, self-adhesive or not, in rolls or tiles", chapter: "39", section: "Construction Materials", gstRate: 18 },
  { code: "3923", description: "Articles for conveyance or packing of goods of plastics (crates, containers)", chapter: "39", section: "Packaging Materials", gstRate: 18 },
  { code: "3915", description: "Waste, parings and scrap of plastics", chapter: "39", section: "Recycling", gstRate: 5 },
  
  // ==========================================
  // CHAPTER 40: RUBBER AND ARTICLES THEREOF
  // ==========================================
  { code: "4009", description: "Tubes, pipes and hoses of vulcanised rubber with fittings", chapter: "40", section: "Industrial Supplies", gstRate: 18 },
  { code: "4016", description: "Other articles of vulcanised rubber (gaskets, washers, seals, grommets)", chapter: "40", section: "Industrial Supplies", gstRate: 18 },
  { code: "4010", description: "Conveyor or transmission belts or belting of vulcanised rubber", chapter: "40", section: "Industrial Supplies", gstRate: 18 },
  { code: "4011", description: "New pneumatic tyres of rubber", chapter: "40", section: "Automotive Parts", gstRate: 28 },
  { code: "4012", description: "Retreaded or used pneumatic tyres of rubber; solid or cushion tyres", chapter: "40", section: "Automotive Parts", gstRate: 28 },
  { code: "4013", description: "Inner tubes of rubber", chapter: "40", section: "Automotive Parts", gstRate: 28 },
  { code: "4008", description: "Plates, sheets, strip, rods and profile shapes of vulcanised rubber", chapter: "40", section: "Industrial Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 44: WOOD AND ARTICLES OF WOOD
  // ==========================================
  { code: "4418", description: "Builders' joinery and carpentry of wood (doors, windows, shutters)", chapter: "44", section: "Construction Materials", gstRate: 18 },
  { code: "4410", description: "Particle board, oriented strand board (OSB) and similar board of wood", chapter: "44", section: "Construction Materials", gstRate: 18 },
  { code: "4411", description: "Fibreboard of wood or other ligneous materials (MDF, HDF)", chapter: "44", section: "Construction Materials", gstRate: 18 },
  { code: "4412", description: "Plywood, veneered panels and similar laminated wood", chapter: "44", section: "Construction Materials", gstRate: 18 },
  { code: "4413", description: "Densified wood, in blocks, plates, strips or profile shapes", chapter: "44", section: "Construction Materials", gstRate: 18 },
  { code: "4407", description: "Wood sawn or chipped lengthwise, sliced or peeled", chapter: "44", section: "Construction Materials", gstRate: 18 },
  { code: "4415", description: "Packing cases, boxes, crates, drums and similar packings of wood; cable-drums", chapter: "44", section: "Packaging Materials", gstRate: 18 },
  { code: "4416", description: "Casks, barrels, vats, tubs and other coopers' products of wood", chapter: "44", section: "Packaging Materials", gstRate: 18 },
  { code: "4417", description: "Tools, tool bodies, tool handles, broom or brush bodies of wood", chapter: "44", section: "Hardware & Tools", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 68: ARTICLES OF STONE, PLASTER, CEMENT, ASBESTOS, MICA
  // ==========================================
  { code: "6810", description: "Articles of cement, of concrete or of artificial stone (tiles, flagstones, bricks)", chapter: "68", section: "Construction Materials", gstRate: 18 },
  { code: "6802", description: "Worked monumental or building stone and articles thereof (tiles, cubes)", chapter: "68", section: "Construction Materials", gstRate: 12 },
  { code: "6811", description: "Articles of asbestos-cement, of cellulose fibre-cement (roofing sheets)", chapter: "68", section: "Construction Materials", gstRate: 18 },
  { code: "6806", description: "Slag wool, rock wool and similar mineral wools; exfoliated vermiculite", chapter: "68", section: "Construction Materials", gstRate: 18 },
  { code: "6807", description: "Articles of asphalt or of similar material (roofing felt, damp-proof courses)", chapter: "68", section: "Construction Materials", gstRate: 18 },
  { code: "6809", description: "Articles of plaster or of compositions based on plaster (boards, sheets, panels)", chapter: "68", section: "Construction Materials", gstRate: 18 },
  { code: "6804", description: "Millstones, grindstones, grinding wheels for grinding, polishing, sharpening", chapter: "68", section: "Industrial Supplies", gstRate: 18 },
  { code: "6805", description: "Natural or artificial abrasive powder or grain on base of textile, paper", chapter: "68", section: "Industrial Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 69: CERAMIC PRODUCTS (Tiles, sanitaryware)
  // ==========================================
  { code: "6907", description: "Unglazed ceramic flags and paving, hearth or wall tiles; unglazed ceramic mosaic cubes", chapter: "69", section: "Construction Materials", gstRate: 18 },
  { code: "6908", description: "Glazed ceramic flags and paving, hearth or wall tiles; glazed ceramic mosaic cubes", chapter: "69", section: "Construction Materials", gstRate: 18 },
  { code: "6910", description: "Ceramic sinks, wash basins, pedestals, baths, water closet pans, cisterns", chapter: "69", section: "Construction Materials", gstRate: 18 },
  { code: "6902", description: "Refractory bricks, blocks, tiles and similar refractory ceramic goods", chapter: "69", section: "Construction Materials", gstRate: 18 },
  { code: "6906", description: "Ceramic pipes, conduits, guttering and pipe fittings", chapter: "69", section: "Construction Materials", gstRate: 18 },
  { code: "6909", description: "Ceramic wares for laboratory, chemical or other technical uses", chapter: "69", section: "Laboratory Equipment", gstRate: 18 },
  { code: "6911", description: "Tableware, kitchenware, other household articles and toilet articles of porcelain/china", chapter: "69", section: "Office Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 70: GLASS AND GLASSWARE
  // ==========================================
  { code: "7005", description: "Float glass and surface ground or polished glass, in sheets", chapter: "70", section: "Construction Materials", gstRate: 18 },
  { code: "7007", description: "Safety glass, consisting of toughened (tempered) or laminated glass", chapter: "70", section: "Construction Materials", gstRate: 18 },
  { code: "7008", description: "Multiple-walled insulating units of glass", chapter: "70", section: "Construction Materials", gstRate: 18 },
  { code: "7009", description: "Glass mirrors, whether or not framed, including rear-view mirrors", chapter: "70", section: "Construction Materials", gstRate: 18 },
  { code: "7010", description: "Carboys, bottles, flasks, jars, pots, phials, ampoules of glass", chapter: "70", section: "Packaging Materials", gstRate: 18 },
  { code: "7016", description: "Paving blocks, slabs, bricks, squares, tiles of pressed or moulded glass", chapter: "70", section: "Construction Materials", gstRate: 18 },
  { code: "7019", description: "Glass fibres (including glass wool) and articles thereof", chapter: "70", section: "Construction Materials", gstRate: 18 },
  { code: "7002", description: "Glass in balls, rods or tubes, unworked", chapter: "70", section: "Industrial Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 72: IRON AND STEEL
  // ==========================================
  { code: "7214", description: "Bars and rods of iron or non-alloy steel, not further worked than forged", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7215", description: "Other bars and rods of iron or non-alloy steel", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7210", description: "Flat-rolled products of iron or non-alloy steel, clad, plated or coated", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7216", description: "Angles, shapes and sections of iron or non-alloy steel (I-beams, H-beams, channels)", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7217", description: "Wire of iron or non-alloy steel (binding wire, barbed wire)", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7219", description: "Flat-rolled products of stainless steel, of a width of 600 mm or more", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7222", description: "Other bars and rods of stainless steel; angles, shapes and sections", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7223", description: "Wire of stainless steel", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7225", description: "Flat-rolled products of other alloy steel, of a width of 600 mm or more", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7228", description: "Other bars and rods of other alloy steel; hollow drill bars and rods", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7208", description: "Flat-rolled products of iron or non-alloy steel, hot-rolled (HR coils, sheets)", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7209", description: "Flat-rolled products of iron or non-alloy steel, cold-rolled (CR coils, sheets)", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7211", description: "Flat-rolled products of iron or non-alloy steel, width less than 600mm", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7212", description: "Flat-rolled products of iron/non-alloy steel, clad, plated, width under 600mm", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7213", description: "Bars and rods, hot-rolled, in irregularly wound coils of iron/non-alloy steel (TMT bars)", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7226", description: "Flat-rolled products of other alloy steel, of a width less than 600mm", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7227", description: "Bars and rods, hot-rolled, in irregularly wound coils of other alloy steel", chapter: "72", section: "Construction Materials", gstRate: 18 },
  { code: "7229", description: "Wire of other alloy steel", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  { code: "7202", description: "Ferro-alloys (ferro-manganese, ferro-silicon, ferro-chromium)", chapter: "72", section: "Industrial Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 73: ARTICLES OF IRON OR STEEL (Pipes, structures, hardware)
  // ==========================================
  { code: "7304", description: "Tubes, pipes and hollow profiles, seamless, of iron or steel", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7305", description: "Other tubes and pipes, welded, circular cross-section, of iron or steel (ERW pipes)", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7306", description: "Other tubes, pipes and hollow profiles, of iron or steel (GI pipes, MS pipes)", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7307", description: "Tube or pipe fittings, of iron or steel (elbows, tees, couplings, flanges)", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7308", description: "Structures of iron or steel (bridges, towers, doors, windows, fabricated structural)", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7310", description: "Tanks, casks, drums, cans, boxes of iron or steel (capacity under 300L)", chapter: "73", section: "Industrial Supplies", gstRate: 18 },
  { code: "7312", description: "Stranded wire, ropes, cables, plaited bands, slings of iron or steel", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7318", description: "Screws, bolts, nuts, coach screws, washers, rivets, cotters of iron or steel", chapter: "73", section: "Hardware & Tools", gstRate: 18 },
  { code: "7319", description: "Sewing needles, knitting needles, bodkins, crochet hooks, pins of iron or steel", chapter: "73", section: "Hardware & Tools", gstRate: 18 },
  { code: "7320", description: "Springs and leaves for springs of iron or steel", chapter: "73", section: "Automotive Parts", gstRate: 18 },
  { code: "7311", description: "Containers for compressed or liquefied gas of iron or steel (LPG cylinders)", chapter: "73", section: "Industrial Supplies", gstRate: 18 },
  { code: "7321", description: "Stoves, ranges, grates, cookers, barbecues of iron or steel", chapter: "73", section: "Industrial Supplies", gstRate: 18 },
  { code: "7314", description: "Cloth, grill, netting and fencing of iron or steel wire; expanded metal", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7315", description: "Chain and parts thereof of iron or steel", chapter: "73", section: "Industrial Supplies", gstRate: 18 },
  { code: "7316", description: "Anchors, grapnels and parts thereof of iron or steel", chapter: "73", section: "Industrial Supplies", gstRate: 18 },
  { code: "7322", description: "Radiators for central heating, air heaters and hot air distributors of iron/steel", chapter: "73", section: "HVAC Equipment", gstRate: 18 },
  { code: "7323", description: "Table, kitchen or other household articles of iron or steel; pot scourers", chapter: "73", section: "Office Supplies", gstRate: 18 },
  { code: "7324", description: "Sanitary ware and parts thereof of iron or steel (wash basins, baths)", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7325", description: "Other cast articles of iron or steel (manhole covers, gratings)", chapter: "73", section: "Construction Materials", gstRate: 18 },
  { code: "7326", description: "Other articles of iron or steel (forged, stamped, fabricated items not specified)", chapter: "73", section: "Industrial Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 74: COPPER AND ARTICLES THEREOF
  // ==========================================
  { code: "7411", description: "Copper tubes and pipes", chapter: "74", section: "Construction Materials", gstRate: 18 },
  { code: "7412", description: "Copper tube or pipe fittings (couplings, elbows, sleeves)", chapter: "74", section: "Construction Materials", gstRate: 18 },
  { code: "7408", description: "Copper wire", chapter: "74", section: "Electrical Supplies", gstRate: 18 },
  { code: "7409", description: "Copper plates, sheets and strip, of a thickness exceeding 0.15mm", chapter: "74", section: "Industrial Supplies", gstRate: 18 },
  { code: "7413", description: "Stranded wire, cables, plaited bands of copper, not electrically insulated", chapter: "74", section: "Electrical Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 76: ALUMINIUM AND ARTICLES THEREOF
  // ==========================================
  { code: "7604", description: "Aluminium bars, rods and profiles (extrusions, sections)", chapter: "76", section: "Construction Materials", gstRate: 18 },
  { code: "7606", description: "Aluminium plates, sheets and strip, of a thickness exceeding 0.2mm", chapter: "76", section: "Industrial Supplies", gstRate: 18 },
  { code: "7610", description: "Aluminium structures (doors, windows, frameworks, fabricated structures)", chapter: "76", section: "Construction Materials", gstRate: 18 },
  { code: "7608", description: "Aluminium tubes and pipes", chapter: "76", section: "Construction Materials", gstRate: 18 },
  { code: "7609", description: "Aluminium tube or pipe fittings", chapter: "76", section: "Construction Materials", gstRate: 18 },
  { code: "7616", description: "Other articles of aluminium (rivets, washers, fabricated parts)", chapter: "76", section: "Industrial Supplies", gstRate: 18 },
  { code: "7605", description: "Aluminium wire", chapter: "76", section: "Electrical Supplies", gstRate: 18 },
  { code: "7612", description: "Aluminium casks, drums, cans, boxes (rigid collapsible tubular containers)", chapter: "76", section: "Packaging Materials", gstRate: 18 },
  { code: "7614", description: "Stranded wire, cables, plaited bands of aluminium, not electrically insulated", chapter: "76", section: "Electrical Supplies", gstRate: 18 },
  { code: "7615", description: "Table, kitchen or other household articles of aluminium; scourers, gloves", chapter: "76", section: "Office Supplies", gstRate: 18 },
  { code: "7607", description: "Aluminium foil of thickness not exceeding 0.2mm", chapter: "76", section: "Packaging Materials", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 82: TOOLS, IMPLEMENTS, CUTLERY OF BASE METAL
  // ==========================================
  { code: "8202", description: "Hand saws; blades for saws of all kinds (circular, band, chain, straight)", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8203", description: "Files, rasps, pliers, pincers, tweezers, metal cutting shears, pipe-cutters", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8204", description: "Hand-operated spanners and wrenches; interchangeable spanner sockets", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8205", description: "Hand tools (hammers, screwdrivers, chisels, planes, vices, clamps, anvils)", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8207", description: "Interchangeable tools for hand or machine tools (drills, punches, dies, cutters)", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8201", description: "Hand tools for agriculture, horticulture (spades, shovels, hoes, forks, rakes)", chapter: "82", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8206", description: "Tools of two or more headings put up in sets for retail sale", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8209", description: "Plates, sticks, tips for tools, unmounted, of sintered metal carbides or cermets", chapter: "82", section: "Industrial Supplies", gstRate: 18 },
  { code: "8211", description: "Knives with cutting blades, serrated or not (including pruning knives)", chapter: "82", section: "Hardware & Tools", gstRate: 18 },
  { code: "8214", description: "Other articles of cutlery (hair clippers, butchers knives, paper knives)", chapter: "82", section: "Office Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 83: MISCELLANEOUS ARTICLES OF BASE METAL
  // ==========================================
  { code: "8301", description: "Padlocks and locks of base metal; keys for any of the foregoing articles", chapter: "83", section: "Hardware & Tools", gstRate: 18 },
  { code: "8302", description: "Base metal mountings, fittings for furniture, doors, windows (hinges, handles)", chapter: "83", section: "Hardware & Tools", gstRate: 18 },
  { code: "8305", description: "Fittings for loose-leaf binders, paper clips, staples of base metal", chapter: "83", section: "Office Supplies", gstRate: 18 },
  { code: "8307", description: "Flexible tubing of base metal, with or without fittings (armoured cables)", chapter: "83", section: "Electrical Supplies", gstRate: 18 },
  { code: "8308", description: "Clasps, frames with clasps, buckles, hooks, eyes of base metal", chapter: "83", section: "Hardware & Tools", gstRate: 18 },
  { code: "8309", description: "Stoppers, caps and lids, capsules for bottles, threaded bungs of base metal", chapter: "83", section: "Packaging Materials", gstRate: 18 },
  { code: "8310", description: "Sign-plates, name-plates, address-plates of base metal (excluding heading 9405)", chapter: "83", section: "Industrial Supplies", gstRate: 18 },
  { code: "8311", description: "Wire, rods, tubes, plates, electrodes for soldering, brazing, welding", chapter: "83", section: "Hardware & Tools", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 84: NUCLEAR REACTORS, BOILERS, MACHINERY AND MECHANICAL APPLIANCES
  // ==========================================
  { code: "8402", description: "Steam or other vapour generating boilers; super-heated water boilers", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8413", description: "Pumps for liquids, whether or not fitted with a measuring device; liquid elevators", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8414", description: "Air or vacuum pumps, air or other gas compressors and fans; ventilating hoods", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8415", description: "Air conditioning machines, comprising a motor-driven fan for changing temperature", chapter: "84", section: "HVAC Equipment", gstRate: 28 },
  { code: "8418", description: "Refrigerators, freezers and other refrigerating or freezing equipment", chapter: "84", section: "HVAC Equipment", gstRate: 28 },
  { code: "8419", description: "Machinery for treatment of materials by heating, cooling, drying, distilling", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8421", description: "Centrifuges; filtering or purifying machinery for liquids or gases", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8424", description: "Mechanical appliances for spraying liquids or powders; fire extinguishers", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8425", description: "Pulley tackle and hoists; winches and capstans; jacks", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8426", description: "Ships' derricks; cranes, including cable cranes; mobile lifting frames", chapter: "84", section: "Construction Equipment", gstRate: 28 },
  { code: "8427", description: "Fork-lift trucks; other works trucks fitted with lifting or handling equipment", chapter: "84", section: "Warehouse Equipment", gstRate: 28 },
  { code: "8428", description: "Other lifting, handling, loading or unloading machinery (conveyors, elevators)", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8429", description: "Self-propelled bulldozers, graders, levellers, scrapers, mechanical shovels", chapter: "84", section: "Construction Equipment", gstRate: 28 },
  { code: "8430", description: "Other moving, grading, levelling machinery for earth, minerals or ores", chapter: "84", section: "Construction Equipment", gstRate: 28 },
  { code: "8431", description: "Parts suitable for machinery of headings 8425 to 8430", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8443", description: "Printing machinery; machines for printing plates, cylinders; printers, copiers", chapter: "84", section: "Office Equipment", gstRate: 18 },
  { code: "8450", description: "Household or laundry-type washing machines, including washer-dryer combos", chapter: "84", section: "Electrical Appliances", gstRate: 28 },
  { code: "8456", description: "Machine tools for working any material by removal of material (laser, ultrasonic)", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8457", description: "Machining centres, unit construction machines for working metal", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8458", description: "Lathes (including turning centres) for removing metal", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8462", description: "Machine tools for working metal by forging, hammering, bending, folding, pressing", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8467", description: "Tools for working in the hand, pneumatic, hydraulic or with self-contained motor", chapter: "84", section: "Hardware & Tools", gstRate: 18 },
  { code: "8471", description: "Automatic data processing machines (computers, servers, tablets, laptops)", chapter: "84", section: "IT Equipment", gstRate: 18 },
  { code: "8472", description: "Other office machines (calculators, cash registers, franking machines, staplers)", chapter: "84", section: "Office Equipment", gstRate: 18 },
  { code: "8473", description: "Parts and accessories for machines of heading 8471 (keyboards, mice, drives)", chapter: "84", section: "IT Equipment", gstRate: 18 },
  { code: "8474", description: "Machinery for sorting, screening, separating, washing, crushing, mixing earth/stone", chapter: "84", section: "Construction Equipment", gstRate: 18 },
  { code: "8479", description: "Machines having individual functions, not specified elsewhere in this chapter", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8480", description: "Moulding boxes for metal foundry; mould bases; moulding patterns; moulds", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8481", description: "Taps, cocks, valves for pipes, boiler shells, tanks, vats (gate, globe, ball, butterfly)", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8482", description: "Ball or roller bearings", chapter: "84", section: "Automotive Parts", gstRate: 18 },
  { code: "8483", description: "Transmission shafts, cranks, bearing housings, gears, ball screws, flywheels", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8484", description: "Gaskets and similar joints of metal sheeting combined with other material", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8486", description: "Machines for manufacture of semiconductor devices, electronic integrated circuits", chapter: "84", section: "Electronics Manufacturing", gstRate: 18 },
  { code: "8487", description: "Machinery parts not containing electrical connectors, insulators, coils", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 85: ELECTRICAL MACHINERY AND EQUIPMENT
  // ==========================================
  { code: "8501", description: "Electric motors and generators (excluding generating sets)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8502", description: "Electric generating sets and rotary converters (DG sets)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8503", description: "Parts suitable for use with machines of heading 8501 or 8502", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8504", description: "Electrical transformers, static converters (rectifiers) and inductors (UPS, inverters, stabilizers)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8505", description: "Electro-magnets; permanent magnets; electro-magnetic or permanent magnet chucks, clamps", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8506", description: "Primary cells and primary batteries", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8507", description: "Electric accumulators, including separators therefor (lead-acid, Li-ion, NiMH batteries)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8508", description: "Vacuum cleaners", chapter: "85", section: "Electrical Appliances", gstRate: 18 },
  { code: "8509", description: "Electro-mechanical domestic appliances with self-contained electric motor", chapter: "85", section: "Electrical Appliances", gstRate: 18 },
  { code: "8512", description: "Electrical lighting or signalling equipment, windscreen wipers for vehicles", chapter: "85", section: "Automotive Parts", gstRate: 18 },
  { code: "8513", description: "Portable electric lamps designed to function by their own energy source", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8514", description: "Industrial or laboratory electric furnaces and ovens", chapter: "85", section: "Industrial Equipment", gstRate: 18 },
  { code: "8516", description: "Electric water heaters, immersion heaters, space heating apparatus, hair dryers", chapter: "85", section: "Electrical Appliances", gstRate: 18 },
  { code: "8517", description: "Telephone sets, smartphones, modems, routers, network switches, base stations", chapter: "85", section: "IT Equipment", gstRate: 18 },
  { code: "8518", description: "Microphones, loudspeakers, headphones, earphones, audio amplifiers", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8521", description: "Video recording or reproducing apparatus (DVRs, NVRs, CCTV recorders)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8522", description: "Parts and accessories for apparatus of headings 8519 or 8521", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8523", description: "Discs, tapes, solid-state non-volatile storage devices, smart cards, memory cards", chapter: "85", section: "IT Equipment", gstRate: 18 },
  { code: "8525", description: "Cameras, digital cameras, video cameras, CCTV cameras, webcams", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8526", description: "Radar apparatus, radio navigational aid apparatus and radio remote control apparatus", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8527", description: "Reception apparatus for radio-broadcasting (radio receivers)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8528", description: "Monitors and projectors; television reception apparatus (LED, LCD, OLED TVs/displays)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8529", description: "Parts suitable for apparatus of headings 8525 to 8528 (antennas, reflectors)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8531", description: "Electric sound or visual signalling apparatus (sirens, bells, indicator panels, alarms)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8532", description: "Electrical capacitors, fixed, variable or adjustable (pre-set)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8533", description: "Electrical resistors (including rheostats and potentiometers), other than heating resistors", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8534", description: "Printed circuits (PCBs)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8535", description: "Electrical apparatus for switching or protecting electrical circuits exceeding 1000V", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8536", description: "Electrical apparatus for switching or protecting circuits not exceeding 1000V (MCBs, RCCBs, switches, relays, connectors)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8537", description: "Boards, panels, consoles for electric control or distribution (control panels, PLC panels)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8538", description: "Parts for apparatus of headings 8535, 8536 or 8537 (busbars, terminals)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8539", description: "Electric filament or discharge lamps, including sealed beam lamp units, ultra-violet lamps", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8540", description: "Thermionic, cold cathode or photo-cathode valves and tubes (CRT, X-ray tubes)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8541", description: "Diodes, transistors, semiconductor devices, LEDs, photovoltaic cells", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8542", description: "Electronic integrated circuits (ICs, microprocessors, microcontrollers, memory chips)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8543", description: "Electrical machines with individual functions not specified elsewhere", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8544", description: "Insulated wire, cable, optical fibre cables, wiring harness", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8545", description: "Carbon electrodes, carbon brushes, lamp carbons, battery carbons of carbon/graphite", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8546", description: "Electrical insulators of any material", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8547", description: "Insulating fittings for electrical machines, appliances or equipment", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8548", description: "Waste and scrap of primary cells, batteries and electric accumulators", chapter: "85", section: "Recycling", gstRate: 5 },
  
  // ==========================================
  // CHAPTER 87: VEHICLES OTHER THAN RAILWAY OR TRAMWAY ROLLING STOCK
  // ==========================================
  { code: "8708", description: "Parts and accessories of motor vehicles (brakes, gear boxes, drive-axles, wheels, suspension, radiators, silencers, exhaust pipes, clutches, steering wheels, safety airbags)", chapter: "87", section: "Automotive Parts", gstRate: 28 },
  { code: "8714", description: "Parts and accessories of vehicles of headings 8711 to 8713 (motorcycle parts, cycle parts)", chapter: "87", section: "Automotive Parts", gstRate: 28 },
  { code: "8701", description: "Tractors (other than tractors of heading 8709)", chapter: "87", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8702", description: "Motor vehicles for the transport of ten or more persons, including the driver (buses)", chapter: "87", section: "Automotive", gstRate: 28 },
  { code: "8704", description: "Motor vehicles for the transport of goods (trucks, pickups, tempos, containers)", chapter: "87", section: "Automotive", gstRate: 28 },
  { code: "8705", description: "Special purpose motor vehicles (cranes, fire fighting, concrete mixer, road sweeper)", chapter: "87", section: "Construction Equipment", gstRate: 28 },
  { code: "8709", description: "Works trucks, self-propelled, fitted with lifting equipment for factories, warehouses", chapter: "87", section: "Warehouse Equipment", gstRate: 28 },
  { code: "8716", description: "Trailers and semi-trailers; other vehicles, not mechanically propelled", chapter: "87", section: "Automotive", gstRate: 28 },
  
  // ==========================================
  // CHAPTER 90: OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC, MEASURING, MEDICAL INSTRUMENTS
  // ==========================================
  { code: "9001", description: "Optical fibres and optical fibre bundles; optical fibre cables", chapter: "90", section: "IT Equipment", gstRate: 18 },
  { code: "9002", description: "Lenses, prisms, mirrors of any material, mounted (CCTV lenses, optical lenses)", chapter: "90", section: "Electronics", gstRate: 18 },
  { code: "9018", description: "Instruments and appliances used in medical, surgical, dental or veterinary sciences (surgical instruments, syringes, needles, catheters, cannulae, diagnostic instruments)", chapter: "90", section: "Medical Equipment", gstRate: 12 },
  { code: "9020", description: "Other breathing appliances and gas masks, excluding protective masks", chapter: "90", section: "Medical Equipment", gstRate: 12 },
  { code: "9021", description: "Orthopaedic appliances (crutches, surgical belts, trusses, splints, artificial limbs)", chapter: "90", section: "Medical Equipment", gstRate: 12 },
  { code: "9022", description: "X-ray apparatus; computed tomography (CT) apparatus; MRI machines", chapter: "90", section: "Medical Equipment", gstRate: 18 },
  { code: "9025", description: "Hydrometers, thermometers, pyrometers, barometers, hygrometers (digital/analog)", chapter: "90", section: "Measuring Instruments", gstRate: 18 },
  { code: "9026", description: "Instruments for measuring flow, level, pressure of liquids or gases (sensors, gauges)", chapter: "90", section: "Measuring Instruments", gstRate: 18 },
  { code: "9027", description: "Instruments for physical or chemical analysis (spectrometers, gas analyzers, pH meters)", chapter: "90", section: "Laboratory Equipment", gstRate: 18 },
  { code: "9028", description: "Gas, liquid or electricity supply or production meters (energy meters, water meters)", chapter: "90", section: "Electrical Equipment", gstRate: 18 },
  { code: "9030", description: "Oscilloscopes, spectrum analyzers for measuring electrical quantities (multimeters)", chapter: "90", section: "Electrical Equipment", gstRate: 18 },
  { code: "9031", description: "Measuring or checking instruments not specified elsewhere (coordinate measuring machines)", chapter: "90", section: "Measuring Instruments", gstRate: 18 },
  { code: "9032", description: "Automatic regulating or controlling instruments (thermostats, pressure controllers, PLC)", chapter: "90", section: "Industrial Equipment", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 94: FURNITURE; PREFABRICATED BUILDINGS
  // ==========================================
  { code: "9401", description: "Seats, whether or not convertible into beds (office chairs, sofas)", chapter: "94", section: "Office Supplies", gstRate: 18 },
  { code: "9403", description: "Other furniture and parts thereof (office desks, tables, cabinets, shelves)", chapter: "94", section: "Office Supplies", gstRate: 18 },
  { code: "9405", description: "Luminaires and lighting fittings (chandeliers, ceiling lights, wall lights, lamps)", chapter: "94", section: "Electrical Equipment", gstRate: 18 },
  { code: "9406", description: "Prefabricated buildings (site offices, security cabins, portable toilets, container offices)", chapter: "94", section: "Construction Materials", gstRate: 18 },
  { code: "9402", description: "Medical, surgical, dental or veterinary furniture (operating tables, examination tables, hospital beds)", chapter: "94", section: "Medical Equipment", gstRate: 12 },
  { code: "9404", description: "Mattress supports; articles of bedding (mattresses, quilts, cushions, pillows)", chapter: "94", section: "Office Supplies", gstRate: 18 },
  
  // ==========================================
  // CHAPTER 96: MISCELLANEOUS MANUFACTURED ARTICLES
  // ==========================================
  { code: "9603", description: "Brooms, brushes, mops, feather dusters, squeegees, paint brushes", chapter: "96", section: "Cleaning Supplies", gstRate: 18 },
  { code: "9606", description: "Buttons, press-fasteners, snap-fasteners, press-studs, button moulds", chapter: "96", section: "Industrial Supplies", gstRate: 18 },
  { code: "9607", description: "Slide fasteners (zippers) and parts thereof", chapter: "96", section: "Industrial Supplies", gstRate: 18 },
  { code: "9612", description: "Typewriter or similar ribbons, inked or otherwise prepared (printer cartridges, toner)", chapter: "96", section: "Office Supplies", gstRate: 18 },
  { code: "9617", description: "Vacuum flasks and other vacuum vessels; parts excluding glass inners", chapter: "96", section: "Office Supplies", gstRate: 18 },
  { code: "9619", description: "Sanitary towels, napkins, nappies, tampons, adult diapers", chapter: "96", section: "Medical Equipment", gstRate: 12 },
  
  // Additional Construction Materials - CHAPTER 32: PAINTS, VARNISHES
  { code: "3208", description: "Paints and varnishes based on synthetic polymers, dispersed or dissolved in non-aqueous medium", chapter: "32", section: "Construction Materials", gstRate: 18 },
  { code: "3209", description: "Paints and varnishes based on synthetic polymers, dispersed or dissolved in aqueous medium (emulsion paints)", chapter: "32", section: "Construction Materials", gstRate: 18 },
  { code: "3214", description: "Glaziers' putty, grafting putty, resin cements, caulking compounds, painters' fillings", chapter: "32", section: "Construction Materials", gstRate: 18 },
  { code: "3210", description: "Other paints and varnishes; prepared water pigments for finishing leather", chapter: "32", section: "Construction Materials", gstRate: 18 },
  
  // CHAPTER 48: PAPER, PAPERBOARD (Packaging for industrial products)
  { code: "4819", description: "Cartons, boxes, cases, bags and other packing containers of paper, paperboard", chapter: "48", section: "Packaging Materials", gstRate: 18 },
  { code: "4821", description: "Paper or paperboard labels of all kinds, whether or not printed", chapter: "48", section: "Packaging Materials", gstRate: 18 },
  { code: "4823", description: "Other paper, paperboard, cellulose wadding cut to size (filter paper, stencil paper)", chapter: "48", section: "Industrial Supplies", gstRate: 18 },
  
  // CHAPTER 59: TEXTILE FABRICS (Industrial fabrics, tarpaulins)
  { code: "5911", description: "Textile products for technical uses (filter cloth, bolting cloth, industrial felts)", chapter: "59", section: "Industrial Supplies", gstRate: 12 },
  { code: "5909", description: "Textile hosepiping and similar textile tubing with lining, armour or accessories", chapter: "59", section: "Industrial Supplies", gstRate: 12 },
  { code: "5910", description: "Transmission or conveyor belts of textile material", chapter: "59", section: "Industrial Supplies", gstRate: 12 },
  
  // CHAPTER 28: INORGANIC CHEMICALS (Industrial chemicals)
  { code: "2811", description: "Other inorganic acids and other inorganic oxygen compounds of non-metals (carbon dioxide, silica)", chapter: "28", section: "Industrial Chemicals", gstRate: 18 },
  { code: "2815", description: "Sodium hydroxide (caustic soda); potassium hydroxide (caustic potash)", chapter: "28", section: "Industrial Chemicals", gstRate: 18 },
  { code: "2828", description: "Hypochlorites; commercial calcium hypochlorite; chlorites; hypobromites", chapter: "28", section: "Industrial Chemicals", gstRate: 18 },
  { code: "2836", description: "Commercial ammonium carbonate and other ammonium carbonates; sodium bicarbonate", chapter: "28", section: "Industrial Chemicals", gstRate: 18 },
  
  // CHAPTER 29: ORGANIC CHEMICALS (Industrial chemicals, solvents)
  { code: "2902", description: "Cyclic hydrocarbons (benzene, toluene, xylene, styrene, ethylbenzene)", chapter: "29", section: "Industrial Chemicals", gstRate: 18 },
  { code: "2905", description: "Acyclic alcohols (methanol, ethanol, isopropyl alcohol, ethylene glycol, glycerine)", chapter: "29", section: "Industrial Chemicals", gstRate: 18 },
  { code: "2915", description: "Saturated acyclic monocarboxylic acids (acetic acid, ethyl acetate, vinyl acetate)", chapter: "29", section: "Industrial Chemicals", gstRate: 18 },
  
  // CHAPTER 27: MINERAL FUELS, OILS
  { code: "2710", description: "Petroleum oils and oils from bituminous minerals (diesel, petrol, lubricating oils, greases)", chapter: "27", section: "Industrial Supplies", gstRate: 18 },
  { code: "2711", description: "Petroleum gases and other gaseous hydrocarbons (LPG, CNG, propane, butane)", chapter: "27", section: "Industrial Supplies", gstRate: 5 },
  { code: "2713", description: "Petroleum coke, petroleum bitumen and other residues of petroleum oils (bitumen for roads)", chapter: "27", section: "Construction Materials", gstRate: 18 },
  
  // ADDITIONAL IT EQUIPMENT AND ELECTRONICS
  { code: "8470", description: "Calculating machines and pocket-size data recording, reproducing machines; accounting machines, cash registers", chapter: "84", section: "Office Equipment", gstRate: 18 },
  { code: "8448", description: "Auxiliary machinery for machines of headings 8444, 8445, 8446, 8447; parts for textile machines", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8510", description: "Shavers, hair clippers and hair-removing appliances with self-contained electric motor", chapter: "85", section: "Electrical Appliances", gstRate: 18 },
  { code: "8524", description: "Flat panel display modules, whether or not incorporating touch-sensitive screens (touch screens, LCD panels)", chapter: "85", section: "Electronics", gstRate: 18 },
  { code: "8530", description: "Electrical signalling, safety or traffic control equipment for railways, roads (traffic signals, boom barriers)", chapter: "85", section: "Electrical Equipment", gstRate: 18 },
  { code: "8549", description: "Electrical and electronic waste and scrap (e-waste)", chapter: "85", section: "Recycling", gstRate: 5 },
  
  // MEDICAL AND HOSPITAL EQUIPMENT
  { code: "9004", description: "Spectacles, goggles and the like, corrective, protective or other (safety glasses, welding goggles)", chapter: "90", section: "Safety Equipment", gstRate: 12 },
  { code: "9019", description: "Mechano-therapy appliances; massage apparatus; psychological aptitude-testing apparatus", chapter: "90", section: "Medical Equipment", gstRate: 12 },
  { code: "9023", description: "Instruments, apparatus and models for demonstrational purposes (anatomical models)", chapter: "90", section: "Laboratory Equipment", gstRate: 18 },
  { code: "9408", description: "Prefabricated buildings of metal (container offices, site cabins, storage containers)", chapter: "94", section: "Construction Materials", gstRate: 18 },
  
  // ADDITIONAL SAFETY EQUIPMENT  
  { code: "6506", description: "Other headgear, whether or not lined or trimmed (safety helmets, hard hats)", chapter: "65", section: "Safety Equipment", gstRate: 12 },
  { code: "6116", description: "Gloves, mittens and mitts, knitted or crocheted (industrial safety gloves)", chapter: "61", section: "Safety Equipment", gstRate: 5 },
  { code: "6210", description: "Garments made up of fabrics of heading 5602, 5603, 5903, 5906 or 5907 (PPE suits, hazmat suits)", chapter: "62", section: "Safety Equipment", gstRate: 12 },
  { code: "6401", description: "Waterproof footwear with outer soles and uppers of rubber or plastics (safety gumboots)", chapter: "64", section: "Safety Equipment", gstRate: 12 },
  { code: "6403", description: "Footwear with outer soles of rubber, plastics, leather and uppers of leather (safety shoes, steel toe boots)", chapter: "64", section: "Safety Equipment", gstRate: 18 },
  
  // AGRICULTURE EQUIPMENT ADDITIONAL
  { code: "8432", description: "Agricultural, horticultural or forestry machinery for soil preparation (ploughs, harrows, cultivators, seeders, manure spreaders)", chapter: "84", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8433", description: "Harvesting or threshing machinery (combine harvesters, reapers, threshers, mowers)", chapter: "84", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8434", description: "Milking machines and dairy machinery", chapter: "84", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8436", description: "Other agricultural, horticultural, poultry-keeping machinery (incubators, brooders)", chapter: "84", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8437", description: "Machines for cleaning, sorting or grading seed, grain or dried leguminous vegetables", chapter: "84", section: "Agriculture Equipment", gstRate: 12 },
  { code: "8424", description: "Agricultural or horticultural sprayers (knapsack sprayers, power sprayers for pesticides)", chapter: "84", section: "Agriculture Equipment", gstRate: 12 },
  
  // PACKAGING MACHINERY
  { code: "8422", description: "Dish washing machines; machinery for cleaning or drying bottles; machinery for filling, closing, sealing, labelling bottles, cans, boxes", chapter: "84", section: "Packaging Equipment", gstRate: 18 },
  { code: "8423", description: "Weighing machinery (weighbridges, platform scales, check weighers, weigh scales)", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  
  // WELDING AND INDUSTRIAL TOOLS
  { code: "8468", description: "Machinery and apparatus for soldering, brazing or welding (welding machines, cutting torches, gas-operated surface tempering machines)", chapter: "84", section: "Industrial Equipment", gstRate: 18 },
  { code: "8515", description: "Electric, laser, ultrasonic, electron beam, plasma arc welding machines; hot spray guns", chapter: "85", section: "Industrial Equipment", gstRate: 18 },
];

async function main() {
  console.log('Seeding HSN codes for PROCURE platform...');
  
  let created = 0;
  let skipped = 0;
  
  for (const hsn of hsnCodes) {
    const exists = await prisma.hsnCode.findUnique({ where: { code: hsn.code } });
    if (!exists) {
      await prisma.hsnCode.create({ data: hsn });
      created++;
    } else {
      skipped++;
    }
  }
  
  console.log(`✅ HSN Seed complete: ${created} created, ${skipped} already existed`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });